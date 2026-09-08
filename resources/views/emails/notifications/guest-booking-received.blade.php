<x-mail::message>
# Hi {{ $guestName }},

Your booking request has been received. You'll be notified once the host reviews it.

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->start_time->format('l, F j, Y') }}
{{ $booking->start_time->format('g:i A') }} – {{ $booking->end_time->format('g:i A') }} ({{ $booking->timezone }})

@if($booking->type_location_detail)
Location: {{ $booking->type_location_detail }}
@endif

Status: {{ ucfirst($booking->status) }}
</x-mail::panel>

Thanks,<br>
The Roicard Team
</x-mail::message>
