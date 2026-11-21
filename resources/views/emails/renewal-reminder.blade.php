<x-mail::message>
# Your membership renews {{ $daysBefore === 1 ? 'tomorrow' : 'in ' . $daysBefore . ' days' }}

Hi {{ $user->first_name }},

Your **{{ $plan?->name ?? 'Roicard' }}** plan renews on {{ optional($renewsOn)->toFormattedDateString() }}.

Please renew from your billing settings. Where card-on-file charging is supported, the saved method may be charged automatically; otherwise complete the renewal link in billing. If your payment is late, you keep full access for a 7-day grace period, after which your account moves to the free plan. Your profile, data and connections are never deleted.

<x-mail::button :url="$billingUrl">
Manage Billing
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
