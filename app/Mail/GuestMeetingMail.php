<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class GuestMeetingMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $templateName,
        public array $templateData,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->templateData['subject'] ?? 'Meeting Notification',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: "emails.notifications.{$this->templateName}",
            with: $this->templateData,
        );
    }
}
