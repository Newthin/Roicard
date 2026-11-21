<?php

namespace App\Services\Growth;

use App\Models\ExecutiveReferral;
use App\Models\Plan;
use App\Models\User;
use App\Services\Billing\EntitlementService;

/**
 * Executive identity and referral assets.
 *
 * Executive status is not stored twice: it comes from the active Executive
 * plan grant resolved by EntitlementService. This service only owns the stable
 * code, shareable link and QR URL attached to that identity.
 *
 * Click tracking, attribution, commissions and payouts are consumed by the
 * Executive dashboard, but remain owned by their own Growth Network services.
 */
class ExecutiveService
{
    public function __construct(protected EntitlementService $entitlements) {}

    public function isExecutive(User $user): bool
    {
        return $this->entitlements->planFor($user)->code === Plan::EXECUTIVE;
    }

    public function forUser(User $user): ?ExecutiveReferral
    {
        return ExecutiveReferral::where('user_id', $user->id)->first();
    }

    public function ensureForUser(User $user): ExecutiveReferral
    {
        return ExecutiveReferral::firstOrCreate(
            ['user_id' => $user->id],
            ['code' => ExecutiveReferral::generateCode()]
        );
    }

    public function findByCode(string $code): ?ExecutiveReferral
    {
        return ExecutiveReferral::where('code', strtoupper(trim($code)))->first();
    }

    /** Public short link encoded by the QR asset. */
    public function link(string $code): string
    {
        return rtrim((string) config('app.frontend_url', config('app.url')), '/')
            . '/r/' . $code . '/';
    }

    /** Absolute URL that serves the QR SVG for this code. */
    public function qrUrl(string $code): string
    {
        return rtrim((string) config('app.url'), '/')
            . '/api/referrals/' . $code . '/qr';
    }

    /** @return array<string, mixed> */
    public function payload(ExecutiveReferral $referral, ?User $user = null): array
    {
        $user ??= $referral->user;

        return [
            'id' => $referral->id,
            'user_id' => $referral->user_id,
            'user' => $user ? [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
            ] : null,
            'code' => $referral->code,
            'url' => $this->link($referral->code),
            'qr_url' => $this->qrUrl($referral->code),
            'created_at' => $referral->created_at?->toIso8601String(),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public function executives(): array
    {
        return $this->executiveUsers()
            ->get()
            ->map(fn (User $user) => $this->payload($this->ensureForUser($user), $user))
            ->all();
    }

    /** @return array<string, mixed>|null */
    public function executiveByUserId(int $userId): ?array
    {
        $user = $this->executiveUsers()
            ->where('users.id', $userId)
            ->first();

        return $user ? $this->payload($this->ensureForUser($user), $user) : null;
    }

    private function executiveUsers(): \Illuminate\Database\Eloquent\Builder
    {
        return User::query()
            ->whereHas('subscription', fn ($q) => $q
                ->where('status', 'active')
                ->whereHas('plan', fn ($p) => $p->where('code', Plan::EXECUTIVE)))
            ->with('subscription.plan');
    }
}
