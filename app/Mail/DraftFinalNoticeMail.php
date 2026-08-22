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
 * Day 7 of the draft expiration sequence — final notice.
 */
class DraftFinalNoticeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Today's your last day.",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.draft-final-notice',
            with: ['user' => $this->user],
        );
    }
}
