<?php

namespace App\Mail;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent at 14/7/3/1 days before a paid period ends. The command records one
 * event per period/day so a re-run never double-sends.
 */
class RenewalReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public Subscription $subscription,
        public int $daysBefore
    ) {}

    public function envelope(): Envelope
    {
        $when = $this->daysBefore === 1 ? 'tomorrow' : "in {$this->daysBefore} days";

        return new Envelope(
            subject: "Your Roicard membership renews {$when}.",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.renewal-reminder',
            with: [
                'user' => $this->user,
                'subscription' => $this->subscription,
                'plan' => $this->subscription->plan,
                'amount' => $this->subscription->plan
                    ? number_format((float) $this->subscription->plan->price, 2)
                    : null,
                'currency' => $this->subscription->plan?->currency ?? 'GHS',
                'daysBefore' => $this->daysBefore,
                'renewsOn' => $this->subscription->current_period_end,
                'billingUrl' => rtrim(config('app.frontend_url', 'http://localhost:3000'), '/')
                    . '/dashboard/settings?tab=billing',
            ],
        );
    }
}
