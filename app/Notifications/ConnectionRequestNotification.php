<?php

namespace App\Notifications;

use App\Models\Connection;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ConnectionRequestNotification extends Notification
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
            'type' => 'connection_request',
            'connection_id' => $this->connectionData->id,
            'guest_name' => $this->connectionData->guest_name,
            'guest_email' => $this->connectionData->guest_email,
            'guest_org' => $this->connectionData->guest_org,
            'title' => 'New Connection Request',
            'body' => "{$this->connectionData->guest_name} wants to connect with you.",
        ];
    }
}
