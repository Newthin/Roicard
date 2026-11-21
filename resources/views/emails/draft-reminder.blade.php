<x-mail::message>
# Finish setting up your Roicard profile

Hi {{ $user->first_name }},

Your Roicard profile is saved but not finished. Complete setup to publish your free public profile, personal link and QR code.

<x-mail::button :url="config('app.frontend_url') . '/dashboard'">
Finish Setup
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
