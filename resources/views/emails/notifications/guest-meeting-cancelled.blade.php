<x-mail::message>
# Hi {{ $guestName }},

Your meeting has been cancelled.

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->start_time->format('l, F j, Y') }}
{{ $booking->start_time->format('g:i A') }} – {{ $booking->end_time->format('g:i A') }} ({{ $booking->timezone }})

@if($reason)
Reason: {{ $reason }}
@endif
</x-mail::panel>

Thanks,<br>
The Roicard Team
</x-mail::message>
