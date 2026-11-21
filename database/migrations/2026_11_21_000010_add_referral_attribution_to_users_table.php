<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stable referral attribution recorded only when a visit becomes a new member.
 * The code is snapshotted so a later code change cannot rewrite history.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('referred_by_user_id')
                ->nullable()
                ->after('discount_campaign_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->string('referred_by_code', 20)
                ->nullable()
                ->after('referred_by_user_id');
            $table->timestamp('referred_at')
                ->nullable()
                ->after('referred_by_code');

            $table->index('referred_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['referred_by_user_id']);
            $table->dropColumn([
                'referred_by_user_id',
                'referred_by_code',
                'referred_at',
            ]);
        });
    }
};
