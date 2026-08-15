<x-mail::message>
# @if($variant === 'member') Welcome aboard, {{ $user->first_name }}! @else Welcome to Roicard, {{ $user->first_name }}! @endif

@if($variant === 'member')
Your Roicard membership is now **active**. Your professional profile is live and ready to be shared — start networking professionally today.
@else
Your Roicard profile has been created and saved privately as a draft. Activate your membership anytime to make it live and start networking professionally.
@endif

<x-mail::button :url="config('app.frontend_url') . '/dashboard'">
Go to Dashboard
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
