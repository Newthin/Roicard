<x-mail::message>
# Your unfinished Roicard profile was closed

Hi {{ $firstName }},

Your 7-day window has passed and the unfinished profile was closed. You're welcome to start again anytime.

<x-mail::button :url="config('app.frontend_url') . '/auth/register'">
Start Again
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
