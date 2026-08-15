<x-mail::message>
# Hi {{ $firstName }},

Your Roicard QR code was just scanned! 🎉

Someone scanned your QR code to view your profile.

<x-mail::button :url="config('app.frontend_url') . '/dashboard/analytics'">
View Your Analytics
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>