<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('smart_cards', function (Blueprint $table) {
            $table->id();
            $table->string('card_id')->unique(); // e.g. RC-2026-00124
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending'); // pending, in_production, shipped, delivered
            $table->string('delivery_name');
            $table->string('street_address');
            $table->string('city');
            $table->string('region');
            $table->string('country')->default('Ghana');
            $table->string('gps_address')->nullable();
            $table->string('delivery_phone');
            $table->text('delivery_notes')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('smart_cards');
    }
};
