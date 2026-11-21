<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();

            // free | active | grace | expired | canceled | founding
            $table->string('status', 20)->default('active');
            $table->string('provider', 30)->nullable();
            $table->string('provider_reference', 100)->nullable();
            $table->string('provider_subscription_id', 100)->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->timestamp('grace_ends_at')->nullable();
            $table->boolean('cancel_at_period_end')->default(false);
            $table->timestamp('canceled_at')->nullable();
            $table->timestamp('ended_at')->nullable();

            // Audit context: source, campaign, credit applied, etc.
            $table->json('meta')->nullable();

            $table->timestamps();

            // One current subscription per member. Renewals and plan changes
            // update this row; history lives in subscription_events.
            $table->unique('user_id');
            $table->index(['status', 'current_period_end']);
            $table->index('current_period_end');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
