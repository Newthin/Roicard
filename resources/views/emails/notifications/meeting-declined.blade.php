<x-mail::message>
# Hi {{ $recipient->first_name }},

Your meeting has been declined.

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->guest_name }} &lt;{{ $booking->guest_email }}&gt;

{{ $booking->start_time->format('l, F j, Y') }}
{{ $booking->start_time->format('g:i A') }} – {{ $booking->end_time->format('g:i A') }} ({{ $booking->timezone }})

@if($reason)
Reason: {{ $reason }}
@endif
</x-mail::panel>

<x-mail::button :url="config('app.frontend_url') . '/dashboard/meetings'">
View Meetings
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
