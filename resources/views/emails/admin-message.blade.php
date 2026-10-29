<x-mail::message>
{!! $bodyHtml !!}

<p style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">
Need help? Contact us at
<a href="mailto:{{ $supportEmail }}" style="color: #111827;">{{ $supportEmail }}</a>.
</p>
</x-mail::message>
