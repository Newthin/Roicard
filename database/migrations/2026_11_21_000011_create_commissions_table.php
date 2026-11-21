<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Growth Network item 3 — cash commission ledger.
 *
 * One row per qualifying payment. Commissions clear immediately on a
 * successful payment and are reversed to `cancelled` on refund or revocation.
 * Payout batches, approval and CSV export are added in later items.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('executive_user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('member_user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('executive_referral_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('referral_click_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            $table->foreignId('payment_id')
                ->nullable()
                ->unique()
                ->constrained()
                ->nullOnDelete();
            $table->foreignId('subscription_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            $table->string('type', 32);
            $table->decimal('amount', 10, 2);
            $table->decimal('collected_amount', 10, 2)->nullable();
            $table->string('currency', 3)->default('GHS');
            $table->string('status', 16)->default('cleared');
            $table->timestamp('cleared_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason', 255)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index('executive_user_id');
            $table->index('member_user_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commissions');
    }
};
