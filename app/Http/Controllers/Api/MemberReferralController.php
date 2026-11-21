<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Growth\MemberReferralCreditService;
use App\Services\Growth\MemberReferralService;
use Illuminate\Http\JsonResponse;

/** Read-only referral tools for verified normal members. */
class MemberReferralController extends Controller
{
    public function __construct(
        protected MemberReferralService $referrals,
        protected MemberReferralCreditService $credits
    ) {}

    /** Referral assets for the authenticated member. */
    public function me(): JsonResponse
    {
        $user = auth()->user();

        if (!$this->referrals->isEligibleReferrer($user)) {
            return response()->json([
                'message' => 'A verified, active member account is required to refer others.',
            ], 403);
        }

        return response()->json([
            'eligible' => true,
            'referral' => $this->referrals->payload($user),
        ]);
    }

    /** Performance, credited earnings and credit history. Always read-only. */
    public function dashboard(): JsonResponse
    {
        $user = auth()->user();

        if (!$this->referrals->isEligibleReferrer($user)) {
            return response()->json([
                'message' => 'A verified, active member account is required to view referral earnings.',
            ], 403);
        }

        return response()->json([
            'dashboard' => $this->referrals->dashboard($user, $this->credits),
        ]);
    }
}
