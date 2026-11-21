<?php

use App\Models\Plan;
use App\Services\Billing\PlanInstaller;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Seeds the internal executive/staff roles.
 *
 * PlanInstaller only inserts missing rows, so an admin who already edited the
 * catalogue keeps their values. No member is assigned automatically; grants go
 * through the existing admin billing endpoint.
 */
return new class extends Migration
{
    public function up(): void
    {
        app(PlanInstaller::class)->seedPlans();
    }

    public function down(): void
    {
        // Only remove rows created here and only while nobody holds them.
        // Real subscriptions, payments and audit events are never deleted.
        foreach ([Plan::EXECUTIVE, Plan::STAFF] as $code) {
            $planId = DB::table('plans')->where('code', $code)->value('id');

            if (!$planId) {
                continue;
            }

            if (DB::table('subscriptions')->where('plan_id', $planId)->exists()) {
                continue;
            }

            DB::table('plans')->where('id', $planId)->delete();
        }
    }
};
