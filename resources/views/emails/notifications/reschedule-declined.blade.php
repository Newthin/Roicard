<x-mail::message>
# Hi {{ $recipient->first_name }},

The reschedule for your meeting has been declined. The original time remains.

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->guest_name }} &lt;{{ $booking->guest_email }}&gt;

**Original time:**
{{ $booking->start_time->format('l, F j, Y g:i A') }} ({{ $booking->timezone }})

**Declined proposed time:**
{{ $rescheduleRequest->proposed_start_time->format('l, F j, Y g:i A') }} ({{ $booking->timezone }})
</x-mail::panel>

<x-mail::button :url="config('app.frontend_url') . '/dashboard/meetings'">
View Meeting
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
