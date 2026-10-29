<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\View;

/**
 * One individually addressed manual admin message.
 *
 * This mailable is deliberately NOT queued: it is sent from
 * SendAdminMessageRecipientJob, which already runs on the queue and provides
 * per-recipient retry/rate limiting. Queuing the mailable as well would create
 * a second job per recipient and make idempotency harder to reason about.
 */
class AdminMessageMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $subjectLine,
        public string $bodyText,
        public string $bodyHtml,
        public ?string $recipientName = null,
        public ?int $adminMessageId = null,
        public ?int $recipientUserId = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(
                config('mail.admin.from_address'),
                config('mail.admin.from_name'),
            ),
            subject: $this->subjectLine,
            // No replyTo: replies are intentionally disabled for bulk mail.
        );
    }

    public function content(): Content
    {
        // Markdown rendering temporarily rebinds the "mail" view namespace to
        // the text components. Reset it before this HTML view renders so a
        // worker that sent a text mail earlier still resolves <x-mail::message>
        // to the HTML components.
        View::replaceNamespace('mail', resource_path('views/vendor/mail/html'));
        // The finder caches resolved view paths, so a previous text render
        // would otherwise keep returning text/message.blade.php.
        View::flushFinderCache();

        return new Content(
            view: 'emails.admin-message',
            text: 'emails.admin-message-text',
            with: [
                'bodyHtml' => $this->bodyHtml,
                'bodyText' => $this->bodyText,
                'recipientName' => $this->recipientName,
                'supportEmail' => config('mail.admin.support_email'),
            ],
        );
    }

    public function headers(): Headers
    {
        if ($this->adminMessageId === null || $this->recipientUserId === null) {
            return new Headers();
        }

        return new Headers(text: [
            // Resend de-duplicates retries for 24h per recipient.
            'Resend-Idempotency-Key' => "admin-message:{$this->adminMessageId}:user:{$this->recipientUserId}",
        ]);
    }
}
