<x-mail::message>
# Hi {{ $guestName }},

The reschedule for your meeting has been declined. The original time remains.

<x-mail::panel>
**{{ $booking->type_name }}**

**Original time:**
{{ $booking->start_time->format('l, F j, Y g:i A') }} ({{ $booking->timezone }})

**Declined proposed time:**
{{ $rescheduleRequest->proposed_start_time->format('l, F j, Y g:i A') }} ({{ $booking->timezone }})
</x-mail::panel>

Thanks,<br>
The Roicard Team
</x-mail::message>
