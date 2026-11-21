<?php

use App\Models\ExecutiveReferral;
use App\Models\Plan;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Persistent referral identity for Executive plan holders.
 *
 * Executive status itself is derived from the plan grant, so this table stores
 * only the stable referral code. Existing executive grants are backfilled once.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('executive_referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->unique()
                ->constrained()
                ->cascadeOnDelete();
            $table->string('code', 20)->unique();
            $table->timestamps();
        });

        $executivePlanId = DB::table('plans')
            ->where('code', Plan::EXECUTIVE)
            ->value('id');

        if (!$executivePlanId) {
            return;
        }

        DB::table('subscriptions')
            ->where('plan_id', $executivePlanId)
            ->where('status', 'active')
            ->pluck('user_id')
            ->each(function ($userId) {
                if (DB::table('executive_referrals')->where('user_id', $userId)->exists()) {
                    return;
                }

                DB::table('executive_referrals')->insert([
                    'user_id' => $userId,
                    'code' => ExecutiveReferral::generateCode(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('executive_referrals');
    }
};
