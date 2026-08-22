<x-mail::message>
# Your Roicard is still waiting.

Hi {{ $user->first_name }},

Your profile is saved as a draft — private, and ready when you are. Activate your membership to make it live and start connecting.

<x-mail::button :url="config('app.frontend_url') . '/dashboard'">
Activate Membership
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
