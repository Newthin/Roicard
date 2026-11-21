<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('currency', 3)->default('GHS');

            // `initial_price` is what a brand-new member pays (card + first
            // period). `price` is the recurring amount for renewals and for
            // members who already own a card.
            $table->decimal('initial_price', 10, 2)->default(0);
            $table->decimal('price', 10, 2)->default(0);

            // month | year | none
            $table->string('interval', 20)->default('none');
            $table->boolean('includes_card')->default(false);
            $table->boolean('is_active')->default(true);

            // Founding is an internal plan: it is never sold, so it must not
            // appear on the public pricing page.
            $table->boolean('is_public')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);

            // Entitlement map consumed by EntitlementService. `null` means
            // "unlimited" for limit-style keys (e.g. cv_entries).
            $table->json('features')->nullable();

            $table->timestamps();

            $table->index(['is_active', 'is_public', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
