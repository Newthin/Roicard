<x-mail::message>
# Hi {{ $recipient->first_name }},

A reschedule has been proposed for your meeting.

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->guest_name }} &lt;{{ $booking->guest_email }}&gt;

**Original time:**
{{ $booking->start_time->format('l, F j, Y g:i A') }} ({{ $booking->timezone }})

**Proposed new time:**
{{ $rescheduleRequest->proposed_start_time->format('l, F j, Y g:i A') }} – {{ $rescheduleRequest->proposed_end_time->format('g:i A') }} ({{ $booking->timezone }})

@if($rescheduleRequest->reason)
Reason: {{ $rescheduleRequest->reason }}
@endif
</x-mail::panel>

<x-mail::button :url="config('app.frontend_url') . '/dashboard/meetings?tab=pending'">
Review Reschedule
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
