<x-mail::message>
# Today's your last day to keep your Roicard link

Your unfinished Roicard profile expires today. After midnight, the account will be closed and this profile link will no longer be yours. Complete setup to keep your link.

<x-mail::button :url="config('app.frontend_url') . '/dashboard'">
Finish Setup
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
