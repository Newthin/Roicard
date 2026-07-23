<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('currency')->default('GHS');
            $table->string('method')->nullable(); // card, mobile_money
            $table->string('momo_number')->nullable();
            $table->string('status')->default('pending'); // pending, success, failed
            $table->string('provider_reference')->nullable()->unique();
            $table->string('provider')->nullable(); // paystack, hubtel, mock
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
