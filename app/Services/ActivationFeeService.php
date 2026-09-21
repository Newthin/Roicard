<?php

namespace App\Services;

use App\Models\User;

/**
 * Single source of truth for the membership activation fee.
 *
 * Pricing is always derived server-side — the client never supplies the
 * amount. Recognized campaign codes (e.g. NLF) stamp a discounted rate at
 * registration; everyone else pays the standard activation fee.
 */
class ActivationFeeService
{
    public function for(User $user): float
    {
        $nlfCode = config('roicard.nlf.campaign_code');

        if ($nlfCode !== null && $nlfCode !== '' && $user->campaign_code === strtoupper((string) $nlfCode)) {
            return (float) config('roicard.nlf.activation_fee');
        }

        return (float) config('roicard.activation_fee');
    }
}