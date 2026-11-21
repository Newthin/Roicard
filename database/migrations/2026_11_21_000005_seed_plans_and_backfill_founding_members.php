<?php

use App\Services\Billing\PlanInstaller;
use Illuminate\Database\Migrations\Migration;

/**
 * Seeds the plan catalogue and converts every member who was active under the
 * old one-time GHS 350 model into the non-expiring "founding" plan.
 *
 * The work lives in PlanInstaller so the seeder and the
 * `subscriptions:backfill-founding` command can reuse the exact same rules.
 */
return new class extends Migration
{
    public function up(): void
    {
        $installer = app(PlanInstaller::class);

        $installer->seedPlans();
        $installer->backfillFoundingMembers();
    }

    public function down(): void
    {
        // Only undo rows created by this migration; real members and real
        // payments are never deleted here.
        \Illuminate\Support\Facades\DB::table('subscription_events')
            ->where('type', 'founding_granted')
            ->where('data', 'like', '%"source":"backfill"%')
            ->delete();

        \Illuminate\Support\Facades\DB::table('subscriptions')
            ->where('meta', 'like', '%"source":"backfill"%')
            ->delete();
    }
};
