<?php

namespace App\Observers;

use App\Models\SmartCard;

class SmartCardObserver
{
    public function creating(SmartCard $smartCard): void
    {
        if (empty($smartCard->card_id)) {
            $smartCard->card_id = SmartCard::generateCardId();
        }
    }
}
