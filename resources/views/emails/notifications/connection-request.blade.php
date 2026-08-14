<x-mail::message>
# Hi {{ $connection->member->first_name ?? 'there' }},

{{ $connection->guest_name }} wants to connect with you!

<x-mail::panel>
@if($connection->guest_org)
**{{ $connection->guest_name }}**, {{ $connection->guest_org }}
@else
**{{ $connection->guest_name }}**
@endif
@if($connection->guest_email)
Email: {{ $connection->guest_email }}
@endif
@if($connection->guest_introduction)
{{ $connection->guest_introduction }}
@endif
</x-mail::panel>

<x-mail::button :url="config('app.frontend_url') . '/dashboard/connections/requests'">
Review Connection Request
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>