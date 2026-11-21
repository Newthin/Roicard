<x-mail::message>
# Your membership renews {{ $daysBefore === 1 ? 'tomorrow' : 'in ' . $daysBefore . ' days' }}

Hi {{ $user->first_name }},

Your **{{ $plan?->name ?? 'Roicard' }}** plan renews on {{ optional($renewsOn)->toFormattedDateString() }}@if($amount). The renewal amount is **{{ $currency }} {{ $amount }}**, charged to your saved payment method where supported.@endif

<x-mail::button :url="$billingUrl">
Manage Billing
</x-mail::button>

Where card-on-file is not available, use the billing page to complete payment with the MoMo link. If payment is late, you keep full access for a 7-day grace period, after which your account moves to the free plan. Your profile, data and connections are never deleted.

Thanks,<br>
The Roicard Team
</x-mail::message>
