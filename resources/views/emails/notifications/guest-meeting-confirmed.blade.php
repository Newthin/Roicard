<x-mail::message>
# Hi {{ $guestName }},

Your meeting has been confirmed.

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->start_time->format('l, F j, Y') }}
{{ $booking->start_time->format('g:i A') }} – {{ $booking->end_time->format('g:i A') }} ({{ $booking->timezone }})

@if($booking->type_location_detail)
Location: {{ $booking->type_location_detail }}
@endif
</x-mail::panel>

A calendar invitation is attached to this email.

Thanks,<br>
The Roicard Team
</x-mail::message>
