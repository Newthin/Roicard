<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Growth Network item 4 — one row per commission included in a payout batch.
 * The unique commission_id guarantees a commission can never be paid twice.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payout_batch_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payout_batch_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('commission_id')
                ->unique()
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('executive_user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('GHS');
            $table->string('status', 16)->default('pending');
            $table->timestamps();

            $table->index('executive_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_batch_items');
    }
};
