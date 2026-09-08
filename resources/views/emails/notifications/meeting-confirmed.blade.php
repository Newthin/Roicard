<x-mail::message>
# Hi {{ $recipient->first_name }},

Your meeting has been confirmed.

<x-mail::panel>
**{{ $booking->type_name }}**
{{ $booking->guest_name }} &lt;{{ $booking->guest_email }}&gt;

{{ $booking->start_time->format('l, F j, Y') }}
{{ $booking->start_time->format('g:i A') }} – {{ $booking->end_time->format('g:i A') }} ({{ $booking->timezone }})

@if($booking->type_location_detail)
Location: {{ $booking->type_location_detail }}
@endif
</x-mail::panel>

A calendar invitation is attached to this email.

<x-mail::button :url="config('app.frontend_url') . '/dashboard/meetings'">
View Meeting
</x-mail::button>

Thanks,<br>
The Roicard Team
</x-mail::message>
