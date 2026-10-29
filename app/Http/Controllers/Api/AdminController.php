<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use App\Models\AnalyticsEvent;
use App\Models\Connection;
use App\Models\MeetingBooking;
use App\Models\MeetingType;
use App\Models\Payment;
use App\Models\SmartCard;
use App\Models\User;
use App\Notifications\SmartCardDeliveredNotification;
use App\Notifications\SmartCardShippedNotification;
use App\Services\MemberAccessService;
use App\Services\MemberAccountService;
use App\Services\ProfileSaveService;
use App\Traits\LogsAdminActions;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;
use Spatie\QueryBuilder\QueryBuilder;

class AdminController extends Controller
{
    use LogsAdminActions;

    public function stats(): JsonResponse
    {
        return response()->json([
            'total_users' => User::count(),
            'active_users' => User::where('status', 'active')->count(),
            'draft_users' => User::where('status', 'draft')->count(),
            'total_payments' => Payment::count(),
            'successful_payments' => Payment::where('status', 'success')->count(),
            'total_revenue' => Payment::where('status', 'success')->sum('amount'),
            'total_smart_cards' => SmartCard::count(),
            'cards_shipped' => SmartCard::where('status', 'shipped')->count(),
            'cards_delivered' => SmartCard::where('status', 'delivered')->count(),
            'total_connections' => Connection::count(),
            'total_analytics_events' => AnalyticsEvent::count(),
            'recent_views_7d' => AnalyticsEvent::where('created_at', '>=', now()->subDays(7))->count(),
            'total_meetings' => MeetingBooking::count(),
            'pending_meetings' => MeetingBooking::where('status', 'pending')->count(),
            'confirmed_meetings' => MeetingBooking::where('status', 'confirmed')->count(),
            'declined_meetings' => MeetingBooking::where('status', 'declined')->count(),
            'cancelled_meetings' => MeetingBooking::where('status', 'cancelled')->count(),
            'completed_meetings' => MeetingBooking::where('status', 'completed')->count(),
            'expired_meetings' => MeetingBooking::where('status', 'expired')->count(),
            'total_meeting_types' => MeetingType::count(),
            'active_meeting_types' => MeetingType::where('is_active', true)->count(),
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $users = QueryBuilder::for(User::class)
            ->allowedFilters(['status', 'role', 'first_name', 'last_name', 'email'])
            ->allowedSorts(['created_at', 'first_name', 'last_name', 'email'])
            ->with('profile')
            ->paginate($request->input('per_page', 20));

        // Add the canonical access state so the console never has to infer it
        // from status alone (payment status is separate from access).
        $access = app(MemberAccessService::class);
        $users->getCollection()->transform(function (User $user) use ($access) {
            $payload = $user->toArray();
            $payload['onboarding_completed'] = $user->onboarding_completed_at !== null;
            $payload['is_deactivated'] = $user->isDeactivated();
            $payload['next_step'] = $access->nextStep($user);
            $payload['profile_completion_pct'] = (int) ($user->profile?->completion_pct ?? 0);

            return $payload;
        });

        return response()->json($users);
    }

    /**
     * Full member record for the admin detail panel, including a masked
     * payment history. Wrapped in `data` because the shared leak guard treats
     * top-level `user`/`profile` keys as the authenticated admin's own record.
     */
    public function showUser(string $id): JsonResponse
    {
        $user = User::with([
            'profile.education',
            'profile.experience',
            'profile.achievements',
            'profile.socialLinks',
            'payments',
            'smartCard',
        ])->findOrFail($id);

        return response()->json(['data' => $this->adminUserPayload($user, true)]);
    }

    public function updateUser(string $id, Request $request): JsonResponse
    {
        $user = User::with('profile')->findOrFail($id);
        $profileId = $user->profile?->id;

        $validated = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'username' => [
                'sometimes', 'nullable', 'string', 'max:60',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('profiles', 'slug')->ignore($profileId),
            ],
            'password' => ['sometimes', 'string', 'min:8', 'confirmed'],
            'status' => ['sometimes', 'string', 'in:draft,active'],
            'role' => ['sometimes', 'string', 'in:member,admin'],
            'campaign_code' => ['sometimes', 'nullable', 'string', 'max:40'],
            'onboarding_completed' => ['sometimes', 'boolean'],
            'email_verified' => ['sometimes', 'boolean'],
            'account_access' => ['sometimes', 'string', 'in:active,suspended'],
            // Explicit admin decision: a completion caused by an admin action
            // should not surprise the member with a welcome email unless the
            // admin asked for it.
            'send_welcome_email' => ['sometimes', 'boolean'],
        ]);

        // An admin must not lock themselves out of the console.
        if ($user->id === auth()->id()) {
            if (($validated['role'] ?? null) === 'member') {
                return response()->json(['message' => 'You cannot remove your own admin role'], 422);
            }
            if (($validated['account_access'] ?? null) === 'suspended') {
                return response()->json(['message' => 'You cannot suspend your own account'], 422);
            }
        }

        // Admin completion/welcome email is opt-in (defaults to no email).
        $sendWelcome = (bool) ($validated['send_welcome_email'] ?? false);

        DB::transaction(function () use ($user, $validated, $sendWelcome) {
            foreach (['first_name', 'last_name'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $user->{$field} = $validated[$field];
                }
            }

            if (array_key_exists('email', $validated) && $validated['email'] !== $user->email) {
                $user->email = $validated['email'];
                // Unless the admin explicitly marks it verified, a changed
                // email must be verified again before it can sign in.
                $user->email_verified_at = ($validated['email_verified'] ?? false) ? now() : null;
            } elseif (array_key_exists('email_verified', $validated)) {
                $user->email_verified_at = $validated['email_verified'] ? now() : null;
            }

            if (array_key_exists('role', $validated)) {
                $user->role = $validated['role'];

                if (\Spatie\Permission\Models\Role::where('name', $validated['role'])->where('guard_name', 'web')->exists()) {
                    $user->syncRoles([$validated['role']]);
                }
            }

            if (array_key_exists('campaign_code', $validated)) {
                $code = mb_strtoupper(trim((string) $validated['campaign_code']));

                if ($code === '') {
                    $user->campaign_code = null;
                    $user->discount_campaign_id = null;
                } else {
                    $campaign = \App\Models\DiscountCampaign::where('code', $code)->first();
                    $user->campaign_code = $code;
                    $user->discount_campaign_id = $campaign?->id;
                }
            }

            if (array_key_exists('password', $validated)) {
                $user->password = $validated['password'];
            }

            $user->save();

            // Public username lives on the profile row.
            if (array_key_exists('username', $validated)) {
                $profile = $user->profile()->firstOrCreate([]);
                $profile->slug = $validated['username'] ?: null;
                $profile->save();
                $profile->bustPublicCache();
            }

            // Password resets invalidate every existing session.
            if (array_key_exists('password', $validated)) {
                $user->tokens()->delete();
                $this->logAdminAction('reset_user_password', $user->id);
            }

            // Onboarding is an explicit flag, independent of completion_pct.
            if (array_key_exists('onboarding_completed', $validated)) {
                app(MemberAccountService::class)->markOnboardingComplete(
                    $user,
                    (bool) $validated['onboarding_completed'],
                    $sendWelcome
                );
            }

            // Membership state (payment/activation) and account access
            // (sign-in) are deliberately separate controls.
            if (array_key_exists('status', $validated)) {
                if ($validated['status'] === 'active') {
                    // Activation also completes onboarding (see the service) so
                    // an activated member always lands on the dashboard.
                    app(MemberAccountService::class)->activateMembership($user, $sendWelcome);
                    $this->logAdminAction('activate_membership', $user->id);
                } else {
                    app(MemberAccountService::class)->deactivateMembership($user);
                    $this->logAdminAction('deactivate_membership', $user->id);
                }
            }

            if (array_key_exists('account_access', $validated)) {
                if ($validated['account_access'] === 'suspended') {
                    app(MemberAccountService::class)->suspend($user, true);
                    $this->logAdminAction('suspend_user', $user->id);
                } else {
                    app(MemberAccountService::class)->restore($user);
                    $this->logAdminAction('restore_user', $user->id);
                }
            }
        });

        $user->refresh()->load('profile');

        $this->logAdminAction('update_user', $user->id);

        return response()->json([
            'user' => $this->adminUserPayload($user, true),
            'message' => 'User updated',
        ]);
    }

    /**
     * Admin edit of a member's full profile. Reuses ProfileRequest so the
     * validation rules are identical to the member's own settings flow, and
     * persists through the same ProfileSaveService used by that flow.
     */
    public function updateUserProfile(string $id, \App\Http\Requests\ProfileRequest $request): JsonResponse
    {
        $user = User::findOrFail($id);

        $profile = app(ProfileSaveService::class)->save($user, $request->validated());

        // An admin filling in a member's profile is an explicit "setup done"
        // action — otherwise the member could still be trapped in onboarding
        // with a complete profile. Email stays opt-in for admin actions; the
        // admin can also opt out of marking completion.
        if ((bool) $request->input('mark_onboarding_complete', true)) {
            app(MemberAccountService::class)->markOnboardingComplete(
                $user,
                true,
                $request->boolean('send_welcome_email')
            );
        }

        $this->logAdminAction('update_user_profile', $user->id);

        $user->refresh()->load('profile');

        return response()->json([
            'user' => $this->adminUserPayload($user),
            'profile' => $profile,
            'message' => 'Member profile updated',
        ]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')],
            'username' => [
                'nullable', 'string', 'max:60',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('profiles', 'slug'),
            ],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'status' => ['sometimes', Rule::in(['draft', 'active'])],
            'role' => ['sometimes', Rule::in(['member', 'admin'])],
            'onboarding_completed' => ['sometimes', 'boolean'],
            'email_verified' => ['sometimes', 'boolean'],
            'account_access' => ['sometimes', Rule::in(['active', 'suspended'])],
            'campaign_code' => ['nullable', 'string', 'max:50'],
            'send_welcome_email' => ['sometimes', 'boolean'],
        ]);

        $campaignCode = $validated['campaign_code'] ?? null;
        $campaignId = null;

        if ($campaignCode) {
            $campaignCode = strtoupper(trim($campaignCode));
            $campaignId = \App\Models\DiscountCampaign::where('code', $campaignCode)->value('id');
        }

        $role = $validated['role'] ?? 'member';
        // Admin-created accounts skip onboarding unless the admin explicitly
        // wants the member to complete the journey themselves.
        $onboardingComplete = (bool) ($validated['onboarding_completed'] ?? true);
        $activate = ($validated['status'] ?? 'draft') === 'active';
        $suspend = ($validated['account_access'] ?? 'active') === 'suspended';
        $sendWelcome = (bool) ($validated['send_welcome_email'] ?? false);

        $user = DB::transaction(function () use ($validated, $campaignCode, $campaignId, $role, $onboardingComplete, $activate, $suspend, $sendWelcome) {
            $user = User::create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                // Membership starts as draft; activation is applied below
                // through the shared service (never a fake payment row).
                'status' => 'draft',
                'role' => $role,
                'email_verified_at' => ($validated['email_verified'] ?? true) ? now() : null,
                'campaign_code' => $campaignCode,
                'discount_campaign_id' => $campaignId,
            ]);

            $user->profile()->create([
                'slug' => $validated['username'] ?? null,
            ]);

            // Link any prior guest connection requests to this account
            Connection::linkGuestRequestsToUser($user);

            // Assign Spatie role when it exists (seeded in production).
            if (\Spatie\Permission\Models\Role::where('name', $role)->where('guard_name', 'web')->exists()) {
                $user->assignRole($role);
            }

            $accounts = app(MemberAccountService::class);

            if ($onboardingComplete) {
                $accounts->markOnboardingComplete($user, true, $sendWelcome);
            }

            if ($activate) {
                $accounts->activateMembership($user, $sendWelcome);
            }

            if ($suspend) {
                $accounts->suspend($user, true);
            }

            return $user->fresh();
        });

        $this->logAdminAction('create_user', $user->id);

        if ($activate) {
            $this->logAdminAction('activate_membership', $user->id);
        }

        if ($suspend) {
            $this->logAdminAction('suspend_user', $user->id);
        }

        $user->load('profile');

        return response()->json([
            'user' => $this->adminUserPayload($user, true),
            'message' => 'User created successfully',
        ], 201);
    }

    /** Send a password-reset link so a new member can set their own password. */
    public function sendPasswordReset(string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if (! $user->email) {
            return response()->json(['message' => 'This account has no email address'], 422);
        }

        $status = Password::sendResetLink(['email' => $user->email]);

        if ($status !== Password::RESET_LINK_SENT) {
            return response()->json([
                'message' => 'Unable to send the password reset link right now.',
            ], $status === Password::RESET_THROTTLED ? 429 : 422);
        }

        $this->logAdminAction('send_password_reset', $user->id);

        return response()->json(['message' => 'Password reset link sent']);
    }

    /** Upload/replace a member's avatar from the admin console. */
    public function uploadUserAvatar(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'],
        ]);

        $user = User::findOrFail($id);
        $profile = $user->profile()->firstOrCreate([]);
        $file = $request->file('avatar');

        $profile->addMedia($file)
            ->usingFileName('avatar.' . $file->extension())
            ->toMediaCollection('avatar');

        $profile->bustPublicCache();
        $this->logAdminAction('update_user_avatar', $user->id);

        $url = $profile->getFirstMediaUrl('avatar');

        return response()->json([
            'url' => $url ? $url . '?v=' . now()->timestamp : null,
        ]);
    }

    /** Remove a member's avatar from the admin console. */
    public function deleteUserAvatar(string $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $profile = $user->profile;

        if ($profile) {
            $profile->clearMediaCollection('avatar');
            $profile->bustPublicCache();
        }

        $this->logAdminAction('delete_user_avatar', $user->id);

        return response()->json([
            'url' => null,
            'message' => 'Avatar removed',
        ]);
    }

    /** Admin-safe user representation (never includes password or secrets). */
    protected function adminUserPayload(User $user, bool $withPayments = false): array
    {
        $payload = $user->toArray();
        $payload['onboarding_completed'] = $user->onboarding_completed_at !== null;
        $payload['is_deactivated'] = $user->isDeactivated();
        $payload['next_step'] = app(MemberAccessService::class)->nextStep($user);
        $payload['profile_completion_pct'] = (int) ($user->profile?->completion_pct ?? 0);

        if ($withPayments) {
            $payments = $user->relationLoaded('payments')
                ? $user->payments
                : $user->payments()->get();

            $payload['payments'] = $payments
                ->sortByDesc('created_at')
                ->values()
                ->map(fn (Payment $payment) => $this->adminPaymentPayload($payment))
                ->all();

            $payload['payment_summary'] = [
                'count' => $payments->count(),
                'successful' => $payments->where('status', 'success')->count(),
                'total_paid' => (float) $payments->where('status', 'success')->sum('amount'),
                'has_paid' => $payments->where('status', 'success')->isNotEmpty(),
            ];

            if ($user->relationLoaded('smartCard')) {
                $payload['smart_card'] = $user->smartCard;
            }
        }

        return $payload;
    }

    /** Payment row for the admin panel with the mobile-money number masked. */
    protected function adminPaymentPayload(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'method' => $payment->method,
            'momo_number' => $this->maskPhone($payment->momo_number),
            'status' => $payment->status,
            'provider' => $payment->provider,
            'provider_reference' => $payment->provider_reference,
            'created_at' => optional($payment->created_at)->toISOString(),
        ];
    }

    protected function maskPhone(?string $number): ?string
    {
        if ($number === null || $number === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $number) ?? '';

        if (strlen($digits) <= 4) {
            return str_repeat('*', strlen($digits));
        }

        return str_repeat('*', strlen($digits) - 4) . substr($digits, -4);
    }

    /**
     * Deletes a user account. Soft-deletes the user row (cascade-owned
     * profile, payments, analytics and connections are retained) so the data
     * survives the retention window for investigations; a scheduled purge
     * permanently removes it afterwards.
     */
    public function deleteUser(string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'You cannot delete your own account'], 422);
        }

        $user->profile?->bustPublicCache();

        // Release the physical card back to inventory rather than losing it.
        if ($user->smartCard) {
            $user->smartCard->update([
                'user_id' => null,
                'inventory_status' => SmartCard::STATUS_AVAILABLE,
                'assigned_at' => null,
            ]);
        }

        $this->logAdminAction('delete_user', (int) $user->id);

        // Revoke tokens so the retained account cannot sign in.
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'User account deleted and retained for the retention period']);
    }

    public function dispatchCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);

        if (!in_array($smartCard->inventory_status, [SmartCard::STATUS_ASSIGNED, SmartCard::STATUS_ACTIVE])) {
            return response()->json(['message' => 'Card must be assigned to a member before dispatch'], 400);
        }

        if (!in_array($smartCard->status, ['in_production', 'pending'])) {
            return response()->json(['message' => 'Card cannot be dispatched from current status'], 400);
        }

        $smartCard->update([
            'status' => 'shipped',
            'dispatched_at' => now(),
        ]);

        $smartCard->user?->notify(new SmartCardShippedNotification($smartCard));
        $this->logAdminAction('dispatch_card', $smartCard->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh(),
            'message' => 'Card marked as shipped',
        ]);
    }

    /** Register a physical Roicard into inventory with an "available" status. */
    public function registerCard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'card_id' => ['nullable', 'string', 'max:255', Rule::unique('smart_cards', 'card_id')],
        ]);

        $smartCard = SmartCard::create([
            'card_id' => $validated['card_id'] ?? SmartCard::generateCardId(),
            'inventory_status' => SmartCard::STATUS_AVAILABLE,
        ]);

        $this->logAdminAction('register_card', $smartCard->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh(),
            'message' => "Card {$smartCard->card_id} registered and available",
        ], 201);
    }

    public function assignCard(string $id, Request $request): JsonResponse
    {
        $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);

        $smartCard = SmartCard::findOrFail($id);

        if ($smartCard->inventory_status === SmartCard::STATUS_ACTIVE) {
            return response()->json(['message' => 'Active card cannot be reassigned'], 400);
        }

        // A member holds at most one card (mirrors the hasOne relation and the
        // member-side storeDelivery guard). Releasing any previous holder first.
        SmartCard::where('user_id', $request->user_id)
            ->where('id', '!=', $smartCard->id)
            ->update([
                'user_id' => null,
                'inventory_status' => SmartCard::STATUS_AVAILABLE,
            ]);

        $smartCard->update([
            'user_id' => $request->user_id,
            'inventory_status' => SmartCard::STATUS_ASSIGNED,
            'assigned_at' => now(),
        ]);

        $this->logAdminAction('assign_card', $request->user_id);

        $fresh = $smartCard->fresh()->load(['user:id,first_name,last_name,email', 'user.profile:id,user_id,slug']);

        return response()->json(array_merge([
            'smart_card' => $fresh,
            'message' => 'Card assigned to user',
        ], $this->publicProfileContext($fresh)));
    }

    public function unassignCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);

        if ($smartCard->inventory_status === SmartCard::STATUS_ACTIVE) {
            return response()->json(['message' => 'Active card must be deactivated before unassigning'], 400);
        }

        $smartCard->update([
            'user_id' => null,
            'inventory_status' => SmartCard::STATUS_AVAILABLE,
            'assigned_at' => null,
        ]);

        $this->logAdminAction('unassign_card');

        return response()->json([
            'smart_card' => $smartCard->fresh(),
            'message' => 'Card unassigned',
        ]);
    }

    /** Mark an assigned card as active (linked and in use with its holder). */
    public function activateCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);

        if ($smartCard->inventory_status !== SmartCard::STATUS_ASSIGNED || !$smartCard->user_id) {
            return response()->json(['message' => 'Only an assigned card can be activated'], 400);
        }

        $smartCard->update(['inventory_status' => SmartCard::STATUS_ACTIVE]);

        $this->logAdminAction('activate_card', $smartCard->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh()->load('user:id,first_name,last_name,email'),
            'message' => 'Card activated',
        ]);
    }

    /** Deactivate a card (removed from circulation, holder retained on record). */
    public function deactivateCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);

        if (!in_array($smartCard->inventory_status, [SmartCard::STATUS_ASSIGNED, SmartCard::STATUS_ACTIVE])) {
            return response()->json(['message' => 'Card is not assigned or active'], 400);
        }

        $smartCard->update(['inventory_status' => SmartCard::STATUS_DEACTIVATED]);

        $this->logAdminAction('deactivate_card', $smartCard->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh()->load('user:id,first_name,last_name,email'),
            'message' => 'Card deactivated',
        ]);
    }

    public function deliverCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);

        if ($smartCard->status !== 'shipped') {
            return response()->json(['message' => 'Card must be shipped before delivery'], 400);
        }

        $smartCard->update([
            'status' => 'delivered',
            'delivered_at' => now(),
        ]);

        $smartCard->user?->notify(new SmartCardDeliveredNotification($smartCard));
        $this->logAdminAction('deliver_card', $smartCard->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh(),
            'message' => 'Card marked as delivered',
        ]);
    }

    /**
     * Public-facing URL (and QR image) for a card holder's profile, so the
     * admin programming the physical card has the exact URL to encode without
     * leaving the card view. Null when the card is unassigned or the member
     * has no slug yet.
     */
    protected function publicProfileContext(SmartCard $card): array
    {
        $slug = $card->user?->profile?->slug;

        if (!$slug || !$card->user_id) {
            return [
                'public_profile_url' => null,
                'public_profile_qr_url' => null,
            ];
        }

        $base = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');

        return [
            'public_profile_url' => "{$base}/{$slug}",
            'public_profile_qr_url' => "{$base}/api/qr/image/{$slug}",
        ];
    }

    public function smartCards(Request $request): JsonResponse
    {
        $cards = SmartCard::with(['user:id,first_name,last_name,email', 'user.profile:id,user_id,slug'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        $cards->getCollection()->transform(function (SmartCard $card) {
            return array_merge($card->toArray(), $this->publicProfileContext($card));
        });

        return response()->json($cards);
    }

    public function connections(Request $request): JsonResponse
    {
        $connections = Connection::with('member:id,first_name,last_name,email')
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json($connections);
    }

    public function activityLog(Request $request): JsonResponse
    {
        $logs = AdminActionLog::with('admin:id,first_name,last_name', 'targetUser:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get();

        return response()->json($logs);
    }

    /**
     * Paginated meeting bookings with filters for admin oversight.
     *
     * Filters:
     *  - status: pending|confirmed|declined|cancelled|completed|expired
     *  - member_id: host_user_id
     *  - meeting_type_id: meeting type
     *  - from / to: date range on start_time
     */
    public function meetings(Request $request): JsonResponse
    {
        $query = MeetingBooking::with(['host:id,first_name,last_name,email', 'meetingType:id,name']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('member_id')) {
            $query->where('host_user_id', $request->member_id);
        }

        if ($request->filled('meeting_type_id')) {
            $query->where('meeting_type_id', $request->meeting_type_id);
        }

        if ($request->filled('from')) {
            $query->where('start_time', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('start_time', '<=', $request->to);
        }

        $bookings = $query->orderBy('start_time', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json($bookings);
    }

    public function trends(Request $request): JsonResponse
    {
        $period = $request->input('period', '30d');
        $days = match ($period) {
            '7d' => 7,
            '90d' => 90,
            'all' => null,
            default => 30,
        };
        $start = $days ? now()->subDays($days) : now()->subYears(10);

        $users = User::where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date');

        $connections = Connection::where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date');

        $analytics = AnalyticsEvent::where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date');

        $windowDays = $days ?? 30;
        $dates = collect(range(0, $windowDays - 1))->map(fn ($i) => now()->subDays($i)->format('Y-m-d'))->reverse()->values();

        $chart = fn ($data) => $dates->map(fn ($date) => [
            'label' => Carbon::parse($date)->format('M d'),
            'value' => (int) ($data[$date] ?? 0),
        ])->toArray();

        $nfcUsage = [
            ['label' => 'Active', 'value' => SmartCard::where('inventory_status', SmartCard::STATUS_ACTIVE)->count()],
            ['label' => 'Assigned', 'value' => SmartCard::where('inventory_status', SmartCard::STATUS_ASSIGNED)->count()],
            ['label' => 'Available', 'value' => SmartCard::where('inventory_status', SmartCard::STATUS_AVAILABLE)->count()],
        ];

        return response()->json([
            'usersGrowth' => $chart($users->toArray()),
            'connectionsGrowth' => $chart($connections->toArray()),
            'nfcUsage' => $nfcUsage,
            'profileViewTrends' => $chart($analytics->toArray()),
        ]);
    }
}
