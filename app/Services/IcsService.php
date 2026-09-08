<?php

namespace App\Services;

use App\Models\MeetingBooking;
use Carbon\Carbon;

class IcsService
{
    public function generateContent(MeetingBooking $booking): string
    {
        $now = Carbon::now('UTC')->format('Ymd\THis\Z');
        $start = $booking->start_time->format('Ymd\THis\Z');
        $end = $booking->end_time->format('Ymd\THis\Z');

        $host = $booking->host;
        $guestName = $booking->guest_name;
        $guestEmail = $booking->guest_email;
        $hostName = $host?->first_name . ' ' . $host?->last_name ?? 'Host';
        $hostEmail = $host?->email ?? '';
        $summary = $booking->type_name;
        $description = $this->buildDescription($booking);
        $location = $this->buildLocation($booking);
        $uid = "booking-{$booking->id}@roicard.com";
        $cancellationToken = $booking->guest_cancellation_token;
        $cancelUrl = config('app.frontend_url') . "/meetings/cancel/{$cancellationToken}";

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Roicard//Meetings//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            "UID:{$uid}",
            "DTSTAMP:{$now}",
            "DTSTART:{$start}",
            "DTEND:{$end}",
            "SUMMARY:{$this->escapeIcs($summary)}",
            "DESCRIPTION:{$this->escapeIcs($description)}",
        ];

        if ($location !== '') {
            $lines[] = "LOCATION:{$this->escapeIcs($location)}";
        }

        if ($hostEmail !== '') {
            $lines[] = "ORGANIZER;CN={$this->escapeIcs($hostName)}:mailto:{$hostEmail}";
        }

        if ($guestEmail !== '') {
            $lines[] = "ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=TRUE;CN={$this->escapeIcs($guestName)}:mailto:{$guestEmail}";
        }

        $lines[] = "URL:{$cancelUrl}";
        $lines[] = 'STATUS:CONFIRMED';
        $lines[] = 'TRANSP:OPAQUE';

        $lines[] = 'END:VEVENT';
        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", $lines) . "\r\n";
    }

    public function generateFilename(MeetingBooking $booking): string
    {
        $safe = preg_replace('/[^a-zA-Z0-9_-]/', '_', $booking->type_name);
        return "{$safe}.ics";
    }

    protected function buildDescription(MeetingBooking $booking): string
    {
        $parts = [$booking->type_name];

        if ($booking->type_description) {
            $parts[] = $booking->type_description;
        }

        $parts[] = "Guest: {$booking->guest_name} ({$booking->guest_email})";
        $parts[] = "Timezone: {$booking->timezone}";

        if ($booking->guest_notes) {
            $parts[] = "Notes: {$booking->guest_notes}";
        }

        return implode('\\n', $parts);
    }

    protected function buildLocation(MeetingBooking $booking): string
    {
        return $booking->type_location_detail ?? '';
    }

    protected function escapeIcs(string $value): string
    {
        // RFC 5545 §3.3.11: escape \ ; , and newlines
        $value = str_replace('\\', '\\\\', $value);
        $value = str_replace(';', '\\;', $value);
        $value = str_replace(',', '\\,', $value);
        $value = str_replace("\r\n", '\\n', $value);
        $value = str_replace("\r", '\\n', $value);
        $value = str_replace("\n", '\\n', $value);

        return $value;
    }
}
