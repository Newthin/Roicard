<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DispatchAdminMessageJob;
use App\Mail\AdminMessageMail;
use App\Models\AdminMessage;
use App\Models\AdminMessageRecipient;
use App\Models\User;
use App\Services\Admin\AdminMessageGuard;
use App\Services\Admin\AdminMessageQuota;
use App\Services\Admin\AdminMessageRenderer;
use App\Services\Admin\UserAudienceQuery;
use App\Traits\LogsAdminActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Throwable;

class AdminMessageController extends Controller
{
    use LogsAdminActions;

    public function __construct(
        private readonly UserAudienceQuery $audience,
        private readonly AdminMessageRenderer $renderer,
        private readonly AdminMessageGuard $guard,
        private readonly AdminMessageQuota $quota,
    ) {}

    /**
     * Live recipient count + paginated preview for the picker.
     */
    public function recipients(Request $request): JsonResponse
    {
        $perPage = min(100, max(1, (int) $request->input('per_page', 25)));

        $paginator = $this->audience
            ->fromRequest($request, excludeAdmins: true, defaultSort: '-created_at')
            ->paginate($perPage);

        return response()->json([
            'count' => $paginator->total(),
            'data' => collect($paginator->items())->map(fn (User $user) => $this->recipientPayload($user)),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    public function quota(): JsonResponse
    {
        return response()->json($this->quota->snapshot());
    }

    /**
     * Warn before sending when the same subject already went to these people.
     */
    public function duplicateCheck(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:200'],
        ]);

        $users = $this->audience
            ->fromRequest($request, excludeAdmins: true)
            ->get(['id', 'first_name', 'last_name', 'email']);

        $duplicates = $this->duplicateRecipientIds($validated['subject'], $users->pluck('id')->all());
        $sample = $users->whereIn('id', array_slice($duplicates, 0, 10))->values();

        return response()->json([
            'count' => count($duplicates),
            'window_days' => (int) config('mail.admin.duplicate_window_days', 7),
            'recipients' => $sample->map(fn (User $user) => $this->recipientPayload($user))->values(),
        ]);
    }

    /**
     * Render a message without sending it (used by the composer preview).
     */
    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:20000'],
            'category' => ['required', 'string', Rule::in([AdminMessage::CATEGORY_SERVICE, AdminMessage::CATEGORY_NUDGE])],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $errors = $this->guard->validate($validated['category'], $validated['subject'], $validated['body']);
        if ($errors !== []) {
            return $this->validationResponse($errors);
        }

        $admin = $request->user();
        $user = isset($validated['user_id'])
            ? User::find($validated['user_id'])
            : $admin;

        return response()->json($this->renderPreview($validated, $user, $admin->email));
    }

    /**
     * Send the rendered message to the signed-in admin only.
     */
    public function sendTest(Request $request): JsonResponse
    {
        $validated = $this->validateMessage($request);

        $errors = $this->guard->validate($validated['category'], $validated['subject'], $validated['body']);
        if ($errors !== []) {
            return $this->validationResponse($errors);
        }

        $admin = $request->user();
        $rendered = $this->renderer->render($validated['body'], $admin, $admin->email);

        try {
            Mail::to($admin->email)->send(new AdminMessageMail(
                subjectLine: $this->renderer->subject($validated['subject'], $admin, $admin->email),
                bodyText: $rendered['text'],
                bodyHtml: $rendered['html'],
                recipientName: $admin->first_name,
            ));
        } catch (Throwable $e) {
            Log::error('Admin message test send failed', [
                'admin_id' => $admin->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Test send failed. Check the mail configuration and Resend API key.',
                'error' => $e->getMessage(),
            ], 422);
        }

        $this->logAdminAction('send_admin_message_test', $admin->id, [
            'subject' => $validated['subject'],
        ]);

        return response()->json([
            'message' => 'Test message sent to ' . $admin->email . '.',
            'email' => $admin->email,
        ]);
    }

    /**
     * Create a message, snapshot the audience, and fan out queued jobs.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:20000'],
            'category' => ['required', 'string', Rule::in([AdminMessage::CATEGORY_SERVICE, AdminMessage::CATEGORY_NUDGE])],
            'filters' => ['nullable', 'array'],
            'include_user_ids' => ['nullable', 'array', 'max:5000'],
            'include_user_ids.*' => ['integer'],
            'exclude_user_ids' => ['nullable', 'array', 'max:5000'],
            'exclude_user_ids.*' => ['integer'],
            'include_admins' => ['sometimes', 'boolean'],
            'expected_recipient_count' => ['required', 'integer', 'min:1'],
            'confirmation_text' => ['nullable', 'string', 'max:20'],
            'acknowledge_duplicates' => ['sometimes', 'boolean'],
        ]);

        $errors = $this->guard->validate($data['category'], $data['subject'], $data['body']);
        if ($errors !== []) {
            return $this->validationResponse($errors);
        }

        $includeAdmins = (bool) ($data['include_admins'] ?? false);
        $filters = is_array($data['filters'] ?? null) ? $data['filters'] : [];
        $filters['include_user_ids'] = $data['include_user_ids'] ?? [];
        $filters['exclude_user_ids'] = $data['exclude_user_ids'] ?? [];
        $filters['include_admins'] = $includeAdmins;

        $users = $this->audience
            ->build($filters, excludeAdmins: ! $includeAdmins, defaultSort: '-created_at')
            ->get();

        $actualCount = $users->count();

        if ($actualCount === 0) {
            return $this->validationResponse([
                'No members match this audience. Adjust the filters and refresh the count.',
            ]);
        }

        if ($actualCount !== (int) $data['expected_recipient_count']) {
            return $this->validationResponse([
                sprintf(
                    'The audience changed: it now contains %d recipients, not %d. Refresh the preview and try again.',
                    $actualCount,
                    (int) $data['expected_recipient_count'],
                ),
            ]);
        }

        // Large sends require the admin to type the exact count.
        if ($actualCount > 50) {
            if (trim((string) ($data['confirmation_text'] ?? '')) !== (string) $actualCount) {
                return $this->validationResponse([
                    sprintf('Type %d to confirm a send to more than 50 recipients.', $actualCount),
                ]);
            }
        }

        $duplicateIds = $this->duplicateRecipientIds($data['subject'], $users->pluck('id')->all());

        if ($duplicateIds !== [] && ! ($data['acknowledge_duplicates'] ?? false)) {
            return response()->json([
                'message' => sprintf(
                    '%d of these recipients already received a message with this subject in the last %d days.',
                    count($duplicateIds),
                    (int) config('mail.admin.duplicate_window_days', 7),
                ),
                'duplicate_count' => count($duplicateIds),
                'requires_acknowledgement' => true,
            ], 422);
        }

        $recipients = $users
            ->reject(fn (User $user) => in_array($user->id, $duplicateIds, true))
            ->values();

        if ($recipients->isEmpty()) {
            return $this->validationResponse([
                'Every selected recipient already received a message with this subject recently.',
            ]);
        }

        $quotaErrors = $this->quota->errorsFor($recipients->count());
        if ($quotaErrors !== []) {
            return response()->json([
                'message' => 'The Resend sending budget would be exceeded.',
                'errors' => $quotaErrors,
                'quota' => $this->quota->snapshot(),
            ], 422);
        }

        $idempotencyKey = $request->header('Idempotency-Key');

        try {
            $message = DB::transaction(function () use ($data, $filters, $includeAdmins, $recipients, $duplicateIds, $idempotencyKey) {
                $message = AdminMessage::create([
                    'sent_by' => auth()->id(),
                    'subject' => $data['subject'],
                    'body' => $data['body'],
                    'category' => $data['category'],
                    'filter_snapshot' => [
                        'filters' => $filters,
                        'include_admins' => $includeAdmins,
                        'expected_recipient_count' => (int) $data['expected_recipient_count'],
                        'skipped_duplicate_count' => count($duplicateIds),
                    ],
                    'recipient_count' => $recipients->count(),
                    'skipped_count' => count($duplicateIds),
                    'queued_count' => $recipients->count(),
                    'status' => AdminMessage::STATUS_QUEUED,
                    'idempotency_key' => is_string($idempotencyKey) ? $idempotencyKey : null,
                ]);

                $now = now();
                $rows = $recipients->map(fn (User $user) => [
                    'admin_message_id' => $message->id,
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'name' => trim($user->first_name . ' ' . $user->last_name) ?: null,
                    'status' => AdminMessageRecipient::STATUS_QUEUED,
                    'attempts' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all();

                foreach (array_chunk($rows, 500) as $chunk) {
                    AdminMessageRecipient::insert($chunk);
                }

                return $message;
            });
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            // Two identical requests raced past the idempotency cache.
            $existing = AdminMessage::where('idempotency_key', $idempotencyKey)->first();

            if ($existing) {
                return response()->json($existing->loadCount('recipients')->toArray(), 200);
            }

            throw $e;
        }

        DispatchAdminMessageJob::dispatch($message->id);

        $this->logAdminAction('send_admin_message', null, [
            'admin_message_id' => $message->id,
            'subject' => $message->subject,
            'category' => $message->category,
            'recipient_count' => $message->recipient_count,
            'skipped_duplicate_count' => $message->skipped_count,
        ]);

        return response()->json($message->fresh(), 201);
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(100, max(1, (int) $request->input('per_page', 20)));

        $query = AdminMessage::with('sentBy:id,first_name,last_name,email')
            ->withCount([
                'recipients as queued_recipients_count' => fn ($q) => $q->whereIn('status', [
                    AdminMessageRecipient::STATUS_QUEUED,
                    AdminMessageRecipient::STATUS_SENDING,
                ]),
                'recipients as sent_recipients_count' => fn ($q) => $q->where('status', AdminMessageRecipient::STATUS_SENT),
                'recipients as failed_recipients_count' => fn ($q) => $q->where('status', AdminMessageRecipient::STATUS_FAILED),
            ])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = '%' . addcslashes((string) $request->input('search'), '%_\\') . '%';
            $query->where('subject', 'like', $search);
        }

        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => collect($paginator->items())->map(fn (AdminMessage $message) => $this->messagePayload($message, false)),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $message = AdminMessage::with('sentBy:id,first_name,last_name,email')->findOrFail($id);

        $recipients = $message->recipients()
            ->with('user:id,first_name,last_name,email')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = '%' . addcslashes((string) $request->input('search'), '%_\\') . '%';
                $q->where(fn ($inner) => $inner
                    ->where('email', 'like', $search)
                    ->orWhere('name', 'like', $search));
            })
            ->orderBy('id')
            ->paginate(min(100, max(1, (int) $request->input('per_page', 50))));

        return response()->json([
            'message' => $this->messagePayload($message, true),
            'recipients' => collect($recipients->items())->map(fn (AdminMessageRecipient $recipient) => [
                'id' => $recipient->id,
                'user_id' => $recipient->user_id,
                'name' => $recipient->name,
                'email' => $recipient->email,
                'status' => $recipient->status,
                'error' => $recipient->error,
                'attempts' => $recipient->attempts,
                'sent_at' => $recipient->sent_at?->toISOString(),
            ]),
            'current_page' => $recipients->currentPage(),
            'last_page' => $recipients->lastPage(),
            'per_page' => $recipients->perPage(),
            'total' => $recipients->total(),
        ]);
    }

    /**
     * Retry only the failed recipients of an existing message.
     */
    public function retry(int $id): JsonResponse
    {
        $message = AdminMessage::findOrFail($id);

        if (! in_array($message->status, [AdminMessage::STATUS_FAILED, AdminMessage::STATUS_PARTIAL], true)) {
            return $this->validationResponse([
                'Only messages with failed recipients can be retried.',
            ]);
        }

        $reset = $message->recipients()
            ->where('status', AdminMessageRecipient::STATUS_FAILED)
            ->update([
                'status' => AdminMessageRecipient::STATUS_QUEUED,
                'error' => null,
                'updated_at' => now(),
            ]);

        if ($reset === 0) {
            return $this->validationResponse(['There are no failed recipients to retry.']);
        }

        $message->forceFill([
            'completed_at' => null,
            'status' => AdminMessage::STATUS_QUEUED,
        ])->save();

        DispatchAdminMessageJob::dispatch($message->id);

        $this->logAdminAction('retry_admin_message', null, [
            'admin_message_id' => $message->id,
            'recipient_count' => $reset,
        ]);

        return response()->json([
            'message' => sprintf('Queued %d failed recipient(s) for retry.', $reset),
            'queued_count' => $reset,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateMessage(Request $request): array
    {
        return $request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:20000'],
            'category' => ['required', 'string', Rule::in([AdminMessage::CATEGORY_SERVICE, AdminMessage::CATEGORY_NUDGE])],
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function renderPreview(array $validated, ?User $user, string $fallbackEmail): array
    {
        $subject = $this->renderer->subject($validated['subject'], $user, $fallbackEmail);
        $rendered = $this->renderer->render($validated['body'], $user, $fallbackEmail);

        $mail = new AdminMessageMail(
            subjectLine: $subject,
            bodyText: $rendered['text'],
            bodyHtml: $rendered['html'],
            recipientName: $user?->first_name,
        );

        return [
            'subject' => $subject,
            'text' => $rendered['text'],
            'body_html' => $rendered['html'],
            'html' => $mail->render(),
            'recipient' => $user ? [
                'id' => $user->id,
                'name' => trim($user->first_name . ' ' . $user->last_name),
                'email' => $user->email,
            ] : null,
        ];
    }

    /**
     * @param  array<int, int>  $userIds
     * @return array<int, int>
     */
    private function duplicateRecipientIds(string $subject, array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        $windowDays = max(1, (int) config('mail.admin.duplicate_window_days', 7));

        return AdminMessageRecipient::query()
            ->whereIn('user_id', $userIds)
            ->whereIn('status', [
                AdminMessageRecipient::STATUS_QUEUED,
                AdminMessageRecipient::STATUS_SENDING,
                AdminMessageRecipient::STATUS_SENT,
            ])
            ->whereHas('message', function ($query) use ($subject, $windowDays) {
                $query->where('subject', $subject)
                    ->where('created_at', '>=', now()->subDays($windowDays));
            })
            ->pluck('user_id')
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function recipientPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'name' => trim($user->first_name . ' ' . $user->last_name),
            'email' => $user->email,
            'status' => $user->status,
            'role' => $user->role,
            'campaign_code' => $user->campaign_code,
            'onboarding_completed' => $user->onboarding_completed_at !== null,
            'email_verified' => $user->email_verified_at !== null,
            'created_at' => $user->created_at?->toISOString(),
            'draft_closes_at' => $user->draftClosesAt()?->toISOString(),
            'draft_days_remaining' => $this->audience->draftDaysRemaining($user),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function messagePayload(AdminMessage $message, bool $includeBody): array
    {
        return [
            'id' => $message->id,
            'sent_by' => $message->sent_by,
            'sent_by_name' => $message->sentBy
                ? trim($message->sentBy->first_name . ' ' . $message->sentBy->last_name)
                : null,
            'subject' => $message->subject,
            'body' => $includeBody ? $message->body : null,
            'category' => $message->category,
            'filter_snapshot' => $message->filter_snapshot,
            'recipient_count' => $message->recipient_count,
            'skipped_count' => $message->skipped_count,
            'queued_count' => $message->queued_count,
            'sent_count' => $message->sent_count,
            'failed_count' => $message->failed_count,
            'queued_recipients_count' => $message->queued_recipients_count ?? $message->queued_count,
            'sent_recipients_count' => $message->sent_recipients_count ?? $message->sent_count,
            'failed_recipients_count' => $message->failed_recipients_count ?? $message->failed_count,
            'status' => $message->status,
            'is_stuck' => $message->isStuck(),
            'started_at' => $message->started_at?->toISOString(),
            'completed_at' => $message->completed_at?->toISOString(),
            'created_at' => $message->created_at?->toISOString(),
        ];
    }

    /**
     * @param  array<int, string>  $errors
     */
    private function validationResponse(array $errors): JsonResponse
    {
        return response()->json([
            'message' => $errors[0] ?? 'The message could not be sent.',
            'errors' => $errors,
        ], 422);
    }
}
