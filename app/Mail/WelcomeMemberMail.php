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
     * @param  'paid'|'free'  $variant  paid = active subscription, free = public free profile
     */
    public function __construct(
        public User $user,
        public string $variant = 'free',
        public ?string $planName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->variant === 'paid'
                ? 'Welcome to Roicard — your membership is active!'
                : 'Welcome to Roicard — your profile is live',
        );
    }

    public function content(): Content
    {
        $frontend = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
        $slug = $this->user->profile?->slug;

        return new Content(
            markdown: 'emails.welcome-member',
            with: [
                'user' => $this->user,
                'variant' => $this->variant,
                'planName' => $this->planName ?? $this->user->subscription?->plan?->name ?? 'membership',
                'dashboardUrl' => $frontend . '/dashboard',
                'profileUrl' => $slug ? $frontend . '/' . $slug : $frontend . '/dashboard',
                'pricingUrl' => $frontend . '/pricing',
            ],
        );
    }
}
