<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Growth Network item 5 — Finance transfer references and paid state. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payout_batch_items', function (Blueprint $table) {
            $table->string('transfer_reference', 64)->nullable()->after('status');
            $table->timestamp('paid_at')->nullable()->after('transfer_reference');
        });

        Schema::table('payout_batches', function (Blueprint $table) {
            $table->timestamp('paid_at')->nullable()->after('approved_at');
            $table->foreignId('paid_by_user_id')
                ->nullable()
                ->after('paid_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payout_batches', function (Blueprint $table) {
            $table->dropForeign(['paid_by_user_id']);
            $table->dropColumn(['paid_at', 'paid_by_user_id']);
        });

        Schema::table('payout_batch_items', function (Blueprint $table) {
            $table->dropColumn(['transfer_reference', 'paid_at']);
        });
    }
};
