<x-mail::message>
# Your membership has moved to the free plan

Hi {{ $user->first_name }},

Your paid membership has ended and your account is now on the free plan. Your public profile, personal link, QR code and connections are all still there — nothing was deleted.

Paid features such as the physical card, meeting booking, full analytics, contact export and unlimited sections are paused.

<x-mail::button :url="$plansUrl">
Compare plans
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
