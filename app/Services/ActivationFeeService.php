<?php

namespace App\Services;

use App\Models\DiscountCampaign;
use App\Models\Plan;
use App\Models\User;
use App\Services\Billing\PlanCatalog;

/**
 * Backwards-compatible facade over PlanCatalog.
 *
 * Older clients and admin screens still read a single `activation_fee` value.
 * It now means "what this member would pay today for the annual plan", which
 * preserves campaign pricing while the subscription engine owns the truth.
 */
class ActivationFeeService
{
    public function __construct(protected PlanCatalog $catalog) {}

    public function for(User $user): float
    {
        return (float) $this->catalog->quote($user, Plan::ANNUAL)['amount'];
    }

    /**
     * Resolve the member's campaign: prefer the explicit FK, fall back to the
     * stored code (covers members stamped before campaigns became records).
     */
    public function campaignFor(User $user): ?DiscountCampaign
    {
        if ($user->discount_campaign_id) {
            $campaign = DiscountCampaign::find($user->discount_campaign_id);

            if ($campaign) {
                return $campaign;
            }
        }

        if ($user->campaign_code) {
            return DiscountCampaign::where('code', $user->campaign_code)->first();
        }

        return null;
    }
}
