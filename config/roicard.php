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
        'campaign_code' => env('NLF_CAMPAIGN_CODE', 'NLF2026'),
        'activation_fee' => (float) env('NLF_ACTIVATION_FEE_GHS', 0),
    ],

];