<?php

namespace App\Notifications;

use App\Models\Connection;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ConnectionRequestNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Connection $connection
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'connection_request',
            'connection_id' => $this->connection->id,
            'guest_name' => $this->connection->guest_name,
            'guest_email' => $this->connection->guest_email,
            'guest_org' => $this->connection->guest_org,
            'title' => 'New Connection Request',
            'body' => "{$this->connection->guest_name} wants to connect with you.",
        ];
    }
}
