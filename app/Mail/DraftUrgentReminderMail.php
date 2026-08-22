<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Day 6 of the draft expiration sequence — urgency. Promises that the draft
 * profile and reserved Smart Card will be released after tomorrow; the
 * closure job makes that true by returning unclaimed cards to inventory.
 */
class DraftUrgentReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '1 day left to activate your Roicard.',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.draft-urgent-reminder',
            with: ['user' => $this->user],
        );
    }
}
