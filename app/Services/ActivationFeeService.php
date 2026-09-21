<?php

namespace App\Services;

use App\Models\DiscountCampaign;
use App\Models\User;

/**
 * Single source of truth for the membership activation fee.
 *
 * Pricing is always derived server-side — the client never supplies the
 * amount. A member stamped with a discount campaign pays that campaign's
 * amount; everyone else pays the standard activation fee. Campaigns live in
 * the database so future discounts need no code changes.
 */
class ActivationFeeService
{
    public function for(User $user): float
    {
        $campaign = $this->campaignFor($user);

        if ($campaign) {
            return (float) $campaign->amount;
        }

        return (float) config('roicard.activation_fee');
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
