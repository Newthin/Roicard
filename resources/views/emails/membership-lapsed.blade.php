<x-mail::message>
# Your membership has moved to the free plan

Hi {{ $user->first_name }},

Your paid Roicard membership has ended, so your account is now on the free plan. Nothing has been deleted: your public profile, connections and content are all still there.

Paid features such as meeting booking, full analytics and contact export are paused until you renew.

<x-mail::button :url="$billingUrl">
Renew Membership
</x-mail::button>

You can compare plans any time at [{{ $plansUrl }}]({{ $plansUrl }}).

Thanks,<br>
The Roicard Team
</x-mail::message>
