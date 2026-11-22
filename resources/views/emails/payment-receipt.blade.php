<x-mail::message>
# Payment received

Hi {{ $user->first_name }},

Thank you. Here is your receipt for the Roicard payment below.

<x-mail::panel>
**Amount paid:** {{ $currency }} {{ $amount }}
**Plan:** {{ $planName }}
**For:** {{ $purpose }}
**Paid on:** {{ $paidOn }}
@if($coversFrom && $coversTo)
**Covers:** {{ $coversFrom }} – {{ $coversTo }}
@endif
**Method:** {{ $method }}
**Reference:** {{ $payment->provider_reference }}
</x-mail::panel>

@if((float) $discount > 0)
Referral discount applied: {{ $currency }} {{ $discount }}.

@endif
@if((float) $credit > 0)
Membership credit applied: {{ $currency }} {{ $credit }}.

@endif
You can review your membership in Billing. Keep this reference if you need help with the payment.

<x-mail::button :url="$billingUrl">
Go to Billing
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
