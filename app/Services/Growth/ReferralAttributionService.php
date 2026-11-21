<?php

namespace App\Services\Growth;

use App\Models\ExecutiveReferral;
use App\Models\ReferralClick;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie as CookieJar;
use Symfony\Component\HttpFoundation\Cookie;

/**
 * Last-click referral attribution.
 *
 * A visit to /r/CODE writes an immutable click event and sets a 30-day cookie.
 * Attribution is only persisted when that visitor successfully registers, so
 * anonymous traffic never creates member records or commission obligations.
 */
class ReferralAttributionService
{
    public const COOKIE_NAME = 'roicard_ref';

    public const TTL_MINUTES = 30 * 24 * 60;

    public function __construct(protected ExecutiveService $executives) {}

    public function recordClick(ExecutiveReferral $referral, Request $request): ReferralClick
    {
        return ReferralClick::create([
            'executive_referral_id' => $referral->id,
            'code' => $referral->code,
            'ip_hash' => $this->ipHash($request),
            'user_agent' => $this->truncate($request->userAgent()),
            'referrer' => $this->truncate($request->headers->get('referer')),
            'created_at' => now(),
        ]);
    }

    public function issueCookie(string $code): Cookie
    {
        return CookieJar::make(
            self::COOKIE_NAME,
            $code,
            self::TTL_MINUTES,
            '/',
            null,
            app()->environment('production'),
            true,
            true,
            'lax'
        );
    }

    public function forgetCookie(): Cookie
    {
        return CookieJar::make(
            self::COOKIE_NAME,
            '',
            -60,
            '/',
            null,
            app()->environment('production'),
            true,
            true,
            'lax'
        );
    }

    /** The current click wins; the request body is a fallback when cookies are blocked. */
    public function attributedReferral(Request $request): ?ExecutiveReferral
    {
        $code = $request->cookie(self::COOKIE_NAME) ?: $request->input('referral_code');

        if (!is_string($code) || !preg_match(ExecutiveReferral::CODE_PATTERN, strtoupper($code))) {
            return null;
        }

        $referral = $this->executives->findByCode($code);

        if (!$referral || !$this->executives->isExecutive($referral->user)) {
            return null;
        }

        return $referral;
    }

    /**
     * Persist attribution only on successful registration. Returns the applied
     * referral so callers can clear the cookie from their response.
     */
    public function attributeRegistration(User $user, Request $request): ?ExecutiveReferral
    {
        $referral = $this->attributedReferral($request);

        if (!$referral || $user->referred_by_user_id) {
            return null;
        }

        $user->forceFill([
            'referred_by_user_id' => $referral->user_id,
            'referred_by_code' => $referral->code,
            'referred_at' => now(),
        ])->save();

        $ipHash = $this->ipHash($request);
        $click = ReferralClick::query()
            ->where('code', $referral->code)
            ->when($ipHash, fn ($query, $hash) => $query->where('ip_hash', $hash))
            ->latest()
            ->first();

        $click?->forceFill(['user_id' => $user->id])->save();

        return $referral;
    }

    private function ipHash(Request $request): ?string
    {
        $ip = $request->ip();

        return $ip ? hash_hmac('sha256', $ip, (string) config('app.key')) : null;
    }

    private function truncate(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return mb_substr($value, 0, 500);
    }
}
