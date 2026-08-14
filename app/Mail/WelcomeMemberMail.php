<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeMemberMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  'member'|'draft'  $variant  member = paid/active, draft = non-paying
     */
    public function __construct(
        public User $user,
        public string $variant = 'draft',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->variant === 'member'
                ? 'Welcome to Roicard — your membership is active!'
                : 'Welcome to Roicard!',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.welcome-member',
            with: [
                'user' => $this->user,
                'variant' => $this->variant,
            ],
        );
    }
}
