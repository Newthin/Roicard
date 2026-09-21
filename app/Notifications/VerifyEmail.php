<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class VerifyEmail extends Notification
{
    use Queueable;

    protected string $code;

    public function __construct(string $code)
    {
        $this->code = $code;
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addHours(24),
            ['id' => $notifiable->getKey(), 'hash' => sha1($notifiable->getEmailForVerification())]
        );

        return (new MailMessage)
            ->subject('Verify your ROICARD account')
            ->greeting("Welcome to ROICARD, {$notifiable->first_name}!")
            ->line('Use the code below to verify your account:')
            ->line("Your verification code is: {$this->code}")
            ->line('Or click the link below (valid for 24 hours):')
            ->action('Verify Email Address', $verificationUrl)
            ->line('The verification code expires in 30 minutes.')
            ->line('If you did not create an account, you can safely ignore this email.');
    }
}
