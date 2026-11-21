<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Durable audit trail for a member referral discount and credit use.
 * Amounts are always computed server-side from the quote.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('referral_user_id')
                ->nullable()
                ->after('plan_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->decimal('referral_discount_amount', 10, 2)
                ->default(0)
                ->after('amount');
            $table->decimal('referral_credit_applied', 10, 2)
                ->default(0)
                ->after('referral_discount_amount');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('referral_user_id');
            $table->dropColumn([
                'referral_discount_amount',
                'referral_credit_applied',
            ]);
        });
    }
};
