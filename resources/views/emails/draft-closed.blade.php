<x-mail::message>
# Your Roicard account has been closed.

Hi {{ $firstName }},

Your 7-day window has passed, and your account has been closed. You're welcome to start again anytime — you'll be creating a new profile, as this one is no longer available.

<x-mail::button :url="config('app.frontend_url') . '/auth/register'">
Start Again
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
