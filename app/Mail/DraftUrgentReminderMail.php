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
 * Day 6 of the draft expiration sequence — urgency. The unfinished profile
 * and its reserved link are released after tomorrow by the closure job.
 */
class DraftUrgentReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '1 day left to keep your Roicard link',
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
