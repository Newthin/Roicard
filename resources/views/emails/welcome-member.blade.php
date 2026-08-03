<x-mail::message>
# @if($variant === 'member') Welcome aboard, {{ $user->first_name }}! @else Welcome to Roicard, {{ $user->first_name }}! @endif

@if($variant === 'member')
Your ROICARD membership is now **active**. Your professional card is live and ready to be shared — start connecting with the community today.
@else
Your ROICARD profile is now live and shareable. Upgrade to an active membership at any time to unlock the full ROICARD experience.
@endif

<x-mail::button :url="config('app.frontend_url') . '/dashboard'">
Go to Dashboard
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
