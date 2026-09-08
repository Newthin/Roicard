<x-mail::message>
# Hi {{ $guestName }},

@if($reminderType === '24h')
Your meeting is tomorrow.
@else
Your meeting is starting in 1 hour.
@endif

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->start_time->format('l, F j, Y') }}
{{ $booking->start_time->format('g:i A') }} – {{ $booking->end_time->format('g:i A') }} ({{ $booking->timezone }})

@if($booking->type_location_detail)
Location: {{ $booking->type_location_detail }}
@endif
</x-mail::panel>

Thanks,<br>
The Roicard Team
</x-mail::message>
