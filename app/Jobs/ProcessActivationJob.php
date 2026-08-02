<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Services\SlugService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class ProcessActivationJob implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        public Payment $payment
    ) {}

    public function handle(SlugService $slugService): void
    {
        DB::transaction(function () use ($slugService) {
            $user = $this->payment->user;
            $profile = $user->profile;

            if ($profile->slug === null) {
                $slug = $slugService->generate($user->first_name, $user->last_name);
                $profile->slug = $slug;
            }

            // Mark the public profile live now that membership is active.
            $profile->is_live = true;
            $profile->save();

            $user->status = 'active';
            $user->save();
        });
    }
}
