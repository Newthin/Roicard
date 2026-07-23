<?php

namespace App\Notifications;

use App\Models\Connection;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ConnectionApprovedNotification extends Notification
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
            'type' => 'connection_approved',
            'connection_id' => $this->connection->id,
            'guest_name' => $this->connection->guest_name,
            'title' => 'Connection Approved',
            'body' => "You are now connected with {$this->connection->guest_name}.",
        ];
    }
}
