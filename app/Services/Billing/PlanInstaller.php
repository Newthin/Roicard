<?php

namespace App\Services\Billing;

use App\Models\Plan;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Creates/updates the plan catalogue and converts legacy one-time payers into
 * founding members. Uses the query builder (not Eloquent) so it is safe to run
 * from a migration, a seeder and an artisan command.
 */
class PlanInstaller
{
    /** The canonical catalogue. Prices are in GHS. */
    public const PLANS = [
        [
            'code' => Plan::FREE,
            'name' => 'Free',
            'description' => 'A complete public profile at no cost.',
            'currency' => 'GHS',
            'initial_price' => 0,
            'price' => 0,
            'interval' => 'none',
            'includes_card' => false,
            'is_active' => true,
            'is_public' => true,
            'sort_order' => 1,
            'features' => [
                'public_profile' => true,
                'qr_code' => true,
                'unlimited_sharing' => true,
                'connections' => true,
                'meetings' => false,
                'full_analytics' => false,
                'ai_enrichment' => false,
                'branding' => false,
                'export' => false,
                'priority_support' => false,
                'card' => false,
                'cv_entries' => 3,
                'experience_entries' => 3,
            ],
        ],
        [
            'code' => Plan::MONTHLY,
            'name' => 'Monthly Membership',
            'description' => 'Physical Roicard card, then GHS 30 per month.',
            'currency' => 'GHS',
            'initial_price' => 80,
            'price' => 30,
            'interval' => 'month',
            'includes_card' => true,
            'is_active' => true,
            'is_public' => true,
            'sort_order' => 2,
            'features' => [
                'public_profile' => true,
                'qr_code' => true,
                'unlimited_sharing' => true,
                'connections' => true,
                'meetings' => true,
                'full_analytics' => true,
                'ai_enrichment' => true,
                'branding' => true,
                'export' => true,
                'priority_support' => true,
                'card' => true,
                'cv_entries' => null,
                'experience_entries' => null,
            ],
        ],
        [
            'code' => Plan::ANNUAL,
            'name' => 'Annual Membership',
            'description' => 'Physical Roicard card and twelve months of full access.',
            'currency' => 'GHS',
            'initial_price' => 350,
            'price' => 250,
            'interval' => 'year',
            'includes_card' => true,
            'is_active' => true,
            'is_public' => true,
            'sort_order' => 3,
            'features' => [
                'public_profile' => true,
                'qr_code' => true,
                'unlimited_sharing' => true,
                'connections' => true,
                'meetings' => true,
                'full_analytics' => true,
                'ai_enrichment' => true,
                'branding' => true,
                'export' => true,
                'priority_support' => true,
                'card' => true,
                'cv_entries' => null,
                'experience_entries' => null,
            ],
        ],
        [
            'code' => Plan::FOUNDING,
            'name' => 'Founding Member',
            'description' => 'Legacy lifetime access for members who paid the one-time GHS 350.',
            'currency' => 'GHS',
            'initial_price' => 0,
            'price' => 0,
            'interval' => 'none',
            'includes_card' => true,
            'is_active' => true,
            'is_public' => false,
            'sort_order' => 4,
            'features' => [
                'public_profile' => true,
                'qr_code' => true,
                'unlimited_sharing' => true,
                'connections' => true,
                'meetings' => true,
                'full_analytics' => true,
                'ai_enrichment' => true,
                'branding' => true,
                'export' => true,
                'priority_support' => true,
                'card' => true,
                'cv_entries' => null,
                'experience_entries' => null,
                'mvp1_lifetime' => true,
            ],
        ],
    ];

    /** Insert any missing plans. Existing rows are never overwritten. */
    public function seedPlans(): void
    {
        $now = now();

        foreach (self::PLANS as $plan) {
            if (DB::table('plans')->where('code', $plan['code'])->exists()) {
                continue;
            }

            $features = $plan['features'];
            unset($plan['features']);

            DB::table('plans')->insert($plan + [
                'features' => json_encode($features),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /**
     * Grant the non-expiring founding plan to every member who was active or
     * had a successful payment under the old one-time model.
     *
     * Idempotent: members who already have any subscription row are skipped.
     *
     * @return array{granted:int, skipped:int}
     */
    public function backfillFoundingMembers(): array
    {
        $foundingPlanId = DB::table('plans')->where('code', Plan::FOUNDING)->value('id');

        if (!$foundingPlanId) {
            return ['granted' => 0, 'skipped' => 0];
        }

        $granted = 0;
        $skipped = 0;

        DB::table('users')
            ->whereNull('deleted_at')
            ->where(function ($query) {
                $query->whereNull('role')->orWhere('role', '!=', 'admin');
            })
            ->where(function ($query) {
                $query->where('status', 'active')
                    ->orWhereExists(function ($sub) {
                        $sub->select(DB::raw(1))
                            ->from('payments')
                            ->whereColumn('payments.user_id', 'users.id')
                            ->where('payments.status', 'success');
                    });
            })
            ->orderBy('id')
            ->chunkById(200, function ($users) use ($foundingPlanId, &$granted, &$skipped) {
                foreach ($users as $user) {
                    $exists = DB::table('subscriptions')->where('user_id', $user->id)->exists();

                    if ($exists) {
                        $skipped++;
                        continue;
                    }

                    $firstPaidAt = DB::table('payments')
                        ->where('user_id', $user->id)
                        ->where('status', 'success')
                        ->min('created_at');

                    $startedAt = $firstPaidAt
                        ? Carbon::parse($firstPaidAt)
                        : Carbon::parse($user->created_at ?? now());

                    $subscriptionId = DB::table('subscriptions')->insertGetId([
                        'user_id' => $user->id,
                        'plan_id' => $foundingPlanId,
                        'status' => 'founding',
                        'started_at' => $startedAt,
                        'current_period_start' => $startedAt,
                        'current_period_end' => null,
                        'grace_ends_at' => null,
                        'cancel_at_period_end' => false,
                        'meta' => json_encode([
                            'source' => 'backfill',
                            'migrated_at' => now()->toIso8601String(),
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    DB::table('subscription_events')->insert([
                        'subscription_id' => $subscriptionId,
                        'user_id' => $user->id,
                        'type' => 'founding_granted',
                        'data' => json_encode(['source' => 'backfill']),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $granted++;
                }
            });

        return ['granted' => $granted, 'skipped' => $skipped];
    }
}
