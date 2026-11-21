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
 * Sent once when a paid membership enters the expired state and the member is
 * downgraded to the free plan. Their profile and data remain intact.
 */
class MembershipLapsedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Roicard membership has moved to the free plan.',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.membership-lapsed',
            with: [
                'user' => $this->user,
                'billingUrl' => rtrim(config('app.frontend_url', 'http://localhost:3000'), '/')
                    . '/dashboard/settings?tab=billing',
                'plansUrl' => rtrim(config('app.frontend_url', 'http://localhost:3000'), '/')
                    . '/pricing',
            ],
        );
    }
}
