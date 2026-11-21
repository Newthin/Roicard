<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Membership activation fee (GHS)
    |--------------------------------------------------------------------------
    |
    | The one-time activation amount charged for full membership. The server is
    | the single source of truth for pricing — the client never supplies the
    | amount, so this value (not any request body) determines what is charged.
    |
    */

    'activation_fee' => (float) env('ACTIVATION_FEE_GHS', 350),

    /*
    |--------------------------------------------------------------------------
    | NLF campaign pricing + code
    |--------------------------------------------------------------------------
    |
    | During the NLF mass-onboarding, members who register with the campaign
    | code pay a discounted (or free) activation fee. NLF_CAMPAIGN_CODE is the
    | shared code announced at the event; entering it at registration stamps
    | the discount flag on the account, and NLF_ACTIVATION_FEE_GHS is the fee
    | those members are charged at checkout. Both are set server-side.
    |
    */

    'nlf' => [
        // 50% off the standard GHS 350 activation fee for program members.
        'campaign_code' => env('NLF_CAMPAIGN_CODE', 'NLF2026'),
        'activation_fee' => (float) env('NLF_ACTIVATION_FEE_GHS', 175),
    ],

    /*
    |--------------------------------------------------------------------------
    | Subscription billing
    |--------------------------------------------------------------------------
    |
    | Renewal access is retained during a grace window after the paid period
    | ends, so a failed/missed renewal never locks a member out mid-month.
    | Reminder offsets are days before current_period_end.
    |
    */

    'billing' => [
        'grace_days' => (int) env('BILLING_GRACE_DAYS', 7),
        'renewal_reminder_days' => [14, 7, 3, 1],
        'currency' => env('BILLING_CURRENCY', 'GHS'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Growth Network (v1)
    |--------------------------------------------------------------------------
    |
    | Commission is earned on the first annual membership payment only (new
    | sale or monthly -> annual upgrade). Renewals and monthly plans carry no
    | commission. Discounted sales are capped as a percentage of collected
    | revenue. Payouts clear once the balance reaches the threshold.
    |
    */

    'growth' => [
        'commission' => [
            'annual' => (float) env('GROWTH_COMMISSION_ANNUAL', 100),
            'upgrade' => (float) env('GROWTH_COMMISSION_UPGRADE', 50),
            'discount_rate' => (float) env('GROWTH_COMMISSION_DISCOUNT_RATE', 0.30),
        ],
        'payout' => [
            'minimum' => (float) env('GROWTH_PAYOUT_MINIMUM', 100),
            'cadence_days' => (int) env('GROWTH_PAYOUT_CADENCE_DAYS', 14),
        ],
        'cookie_days' => (int) env('GROWTH_ATTRIBUTION_DAYS', 30),
    ],

];