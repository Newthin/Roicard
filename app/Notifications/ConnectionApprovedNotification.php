<?php

namespace App\Notifications;

use App\Models\Connection;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ConnectionApprovedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Connection $connectionData
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'connection_approved',
            'connection_id' => $this->connectionData->id,
            'guest_name' => $this->connectionData->guest_name,
            'title' => 'Connection Approved',
            'body' => "You are now connected with {$this->connectionData->guest_name}.",
        ];
    }
}
