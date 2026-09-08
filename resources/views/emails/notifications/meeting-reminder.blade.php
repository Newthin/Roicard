<x-mail::message>
# Hi {{ $recipient->first_name }},

@if($reminderType === '24h')
Your meeting is tomorrow.
@else
Your meeting is starting in 1 hour.
@endif

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->guest_name }} &lt;{{ $booking->guest_email }}&gt;

{{ $booking->start_time->format('l, F j, Y') }}
{{ $booking->start_time->format('g:i A') }} – {{ $booking->end_time->format('g:i A') }} ({{ $booking->timezone }})

@if($booking->type_location_detail)
Location: {{ $booking->type_location_detail }}
@endif
</x-mail::panel>

<x-mail::button :url="config('app.frontend_url') . '/dashboard/meetings'">
View Meeting
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
