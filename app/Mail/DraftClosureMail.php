<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Day 8 of the draft expiration sequence — closure confirmation.
 *
 * Takes a plain first-name string rather than the User model on purpose:
 * the account is soft-deleted before/when this mail is queued, and queued
 * mailables re-fetch serialized models from the database when the job runs
 * — which would resolve to null for a soft-deleted user.
 */
class DraftClosureMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public string $firstName) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Roicard account has been closed.',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.draft-closed',
            with: ['firstName' => $this->firstName],
        );
    }
}
