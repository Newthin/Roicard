<x-mail::message>
@if($variant === 'paid')
# Welcome aboard, {{ $user->first_name }}!

Your **{{ $planName }}** membership is active and your profile is live. Your paid benefits are unlocked: physical card, meeting booking, full analytics, contact export, AI enrichment and priority support.

<x-mail::button :url="$dashboardUrl">
Go to Dashboard
</x-mail::button>
@else
# Welcome to Roicard, {{ $user->first_name }}!

Your free profile is live and ready to share. Your personal link and QR code are ready, and you can connect with people freely.

On the free plan you can add up to 3 education and experience entries.

<x-mail::button :url="$profileUrl">
View your profile
</x-mail::button>

Upgrade any time for the physical Roicard card, meeting booking, full analytics, contact export and unlimited sections — see [our plans]({{ $pricingUrl }}).
@endif

Thanks,<br>
The Roicard Team
</x-mail::message>
