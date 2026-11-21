<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Non-cash referral credit ledger for verified members.
 *
 * A row is created when a referred member completes their first membership
 * purchase. Credits are reserved at checkout, used on success, and cancelled
 * (or reversed with a negative adjustment) when the originating payment is
 * refunded.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_referral_credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('earned_from_payment_id')
                ->nullable()
                ->constrained('payments')
                ->nullOnDelete();
            $table->foreignId('member_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('executive_referral_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('GHS');
            $table->string('status', 20)->default('available');
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('reserved_at')->nullable();
            $table->foreignId('reserved_payment_id')
                ->nullable()
                ->constrained('payments')
                ->nullOnDelete();
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_payment_id')
                ->nullable()
                ->constrained('payments')
                ->nullOnDelete();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('expires_at');
            $table->index('reserved_payment_id');
            $table->index('used_payment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_referral_credits');
    }
};
