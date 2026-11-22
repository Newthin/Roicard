<?php

namespace App\Mail;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Proof of an actual charge. Queued from SubscriptionService only after a
 * successful payment has been marked applied, so a replayed provider webhook
 * can never produce a second receipt.
 */
class PaymentReceiptMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public Payment $payment,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Roicard payment receipt',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.payment-receipt',
            with: [
                'user' => $this->user,
                'payment' => $this->payment,
                'planName' => $this->payment->plan?->name ?? 'Roicard membership',
                'amount' => number_format((float) $this->payment->amount, 2),
                'currency' => $this->payment->currency ?: 'GHS',
                'purpose' => $this->purposeLabel(),
                'method' => $this->methodLabel(),
                'paidOn' => $this->payment->updated_at?->toFormattedDateString(),
                'coversFrom' => $this->payment->period_start?->toFormattedDateString(),
                'coversTo' => $this->payment->period_end?->toFormattedDateString(),
                'discount' => number_format((float) $this->payment->referral_discount_amount, 2),
                'credit' => number_format((float) $this->payment->referral_credit_applied, 2),
                'billingUrl' => rtrim(config('app.frontend_url', 'http://localhost:3000'), '/')
                    . '/dashboard/settings?tab=billing',
            ],
        );
    }

    protected function purposeLabel(): string
    {
        return match ($this->payment->purpose) {
            Payment::PURPOSE_RENEWAL => 'Renewal',
            Payment::PURPOSE_UPGRADE => 'Plan upgrade',
            default => 'New membership',
        };
    }

    /**
     * Only the method family is shown. The MoMo number and all provider
     * credentials stay out of email.
     */
    protected function methodLabel(): string
    {
        return match ($this->payment->method) {
            'card', 'paystack' => 'Card',
            'momo', 'mobile_money', 'hubtel' => 'Mobile Money',
            default => ucfirst(str_replace('_', ' ', (string) $this->payment->method)),
        };
    }
}
