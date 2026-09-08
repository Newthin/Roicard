<x-mail::message>
# Hi {{ $guestName }},

The reschedule for your meeting has been accepted.

<x-mail::panel>
**{{ $booking->type_name }}**

**New time:**
{{ $rescheduleRequest->proposed_start_time->format('l, F j, Y') }}
{{ $rescheduleRequest->proposed_start_time->format('g:i A') }} – {{ $rescheduleRequest->proposed_end_time->format('g:i A') }} ({{ $booking->timezone }})
</x-mail::panel>

A calendar invitation is attached to this email.

Thanks,<br>
The Roicard Team
</x-mail::message>
