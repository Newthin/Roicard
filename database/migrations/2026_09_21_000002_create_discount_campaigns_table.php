<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discount_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name', 120);
            // The activation fee a member on this campaign pays (GHS).
            $table->decimal('amount', 10, 2);
            // Optional window. A campaign is only claimable while live.
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            // Admins can close a campaign without deleting it.
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('discount_campaign_id')
                ->nullable()
                ->after('campaign_code')
                ->constrained('discount_campaigns')
                ->nullOnDelete();
        });

        // Preserve the NLF launch campaign as data, not code.
        DB::table('discount_campaigns')->insert([
            'code' => 'NLF2026',
            'name' => 'NLF 2026 Program',
            'amount' => 175,
            'starts_at' => null,
            'expires_at' => null,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('discount_campaign_id');
        });

        Schema::dropIfExists('discount_campaigns');
    }
};
