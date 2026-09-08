<x-mail::message>
# Hi {{ $recipient->first_name }},

The reschedule for your meeting has been accepted.

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->guest_name }} &lt;{{ $booking->guest_email }}&gt;

**New time:**
{{ $rescheduleRequest->proposed_start_time->format('l, F j, Y') }}
{{ $rescheduleRequest->proposed_start_time->format('g:i A') }} – {{ $rescheduleRequest->proposed_end_time->format('g:i A') }} ({{ $booking->timezone }})
</x-mail::panel>

A calendar invitation is attached to this email.

<x-mail::button :url="config('app.frontend_url') . '/dashboard/meetings'">
View Meeting
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
