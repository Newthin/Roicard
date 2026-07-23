<?php

namespace App\Notifications;

use App\Models\SmartCard;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SmartCardDeliveredNotification extends Notification
{
    use Queueable;

    public function __construct(
        public SmartCard $smartCard
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'smart_card_delivered',
            'card_id' => $this->smartCard->card_id,
            'title' => 'Smart Card Delivered',
            'body' => "Your smart card {$this->smartCard->card_id} has been delivered!",
        ];
    }
}
