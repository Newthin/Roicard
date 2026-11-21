<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Growth Network item 4 — admin-controlled payout policy (single row). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payout_settings', function (Blueprint $table) {
            $table->id();
            $table->decimal('minimum_amount', 10, 2)->default(100);
            $table->unsignedInteger('cadence_days')->default(14);
            $table->boolean('is_enabled')->default(true);
            $table->timestamp('last_generated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_settings');
    }
};
