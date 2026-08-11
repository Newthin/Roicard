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
        $member = $this->connectionData->member;
        $memberName = $member
            ? trim($member->first_name . ' ' . $member->last_name)
            : 'a ROICARD member';

        return [
            'type' => 'connection_approved',
            'connection_id' => $this->connectionData->id,
            'guest_name' => $this->connectionData->guest_name,
            'member_name' => $memberName,
            'title' => 'Connection Request Accepted',
            'body' => "{$memberName} accepted your connection request.",
        ];
    }
}