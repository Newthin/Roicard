<?php

use App\Models\Plan;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Commission payouts are planned but not active. Only the executive growth
 * role stays eligible for now; staff keeps every other benefit unchanged.
 *
 * The catalogue is seeded once by PlanInstaller, so existing rows must be
 * corrected explicitly. Only the single feature flag is touched.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->setCommissionFlag(false);
    }

    public function down(): void
    {
        $this->setCommissionFlag(true);
    }

    private function setCommissionFlag(bool $value): void
    {
        $plan = DB::table('plans')->where('code', Plan::STAFF)->first();

        if (!$plan) {
            return;
        }

        $features = json_decode($plan->features ?? '[]', true);
        $features = is_array($features) ? $features : [];
        $features['earns_commission'] = $value;

        DB::table('plans')->where('id', $plan->id)->update([
            'features' => json_encode($features),
            'updated_at' => now(),
        ]);
    }
};
