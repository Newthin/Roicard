<x-mail::message>
# Hi {{ $guestName }},

Your meeting has been declined.

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->start_time->format('l, F j, Y') }}
{{ $booking->start_time->format('g:i A') }} – {{ $booking->end_time->format('g:i A') }} ({{ $booking->timezone }})

@if($reason)
Reason: {{ $reason }}
@endif
</x-mail::panel>

You can try booking another time on the host's profile.

Thanks,<br>
The Roicard Team
</x-mail::message>
