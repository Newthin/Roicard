<x-mail::message>
# @if($variant === 'member') Welcome aboard, {{ $user->first_name }}! @else Welcome to Roicard, {{ $user->first_name }}! @endif

@if($variant === 'member')
Your Roicard membership is now **active**. Your professional card is live and ready to be shared — start connecting with the community today.
@else
Your Roicard profile has been created and saved privately as a draft. Activate your membership anytime to make it live and start sharing your identity with the community.
@endif

<x-mail::button :url="config('app.frontend_url') . '/dashboard'">
Go to Dashboard
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
