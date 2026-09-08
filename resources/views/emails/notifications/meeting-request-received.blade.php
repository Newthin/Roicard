<x-mail::message>
# Hi {{ $host->first_name }},

{{ $booking->guest_name }} has requested a meeting with you.

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->guest_name }} &lt;{{ $booking->guest_email }}&gt;

{{ $booking->start_time->format('l, F j, Y') }}
{{ $booking->start_time->format('g:i A') }} – {{ $booking->end_time->format('g:i A') }} ({{ $booking->timezone }})

@if($booking->guest_notes)
Notes: {{ $booking->guest_notes }}
@endif
</x-mail::panel>

<x-mail::button :url="config('app.frontend_url') . '/dashboard/meetings?tab=pending'">
Review Booking Request
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
