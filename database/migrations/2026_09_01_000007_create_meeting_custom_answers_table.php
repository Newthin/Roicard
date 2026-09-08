<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_custom_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('meeting_bookings')->cascadeOnDelete();
            $table->string('question');
            $table->text('answer');
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['booking_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_custom_answers');
    }
};
