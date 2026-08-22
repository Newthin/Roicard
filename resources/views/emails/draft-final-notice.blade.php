<x-mail::message>
# Today's your last day.

Your Roicard reservation expires today. After midnight, your account will be closed, and this profile link will no longer be yours. Activate now to keep it.

<x-mail::button :url="config('app.frontend_url') . '/dashboard'">
Activate Membership
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
