<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_reschedule_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('meeting_bookings')->cascadeOnDelete();
            $table->foreignId('requested_by_user_id')->constrained('users');
            $table->timestamp('proposed_start_time');
            $table->timestamp('proposed_end_time');
            $table->string('status')->default('pending'); // pending, accepted, declined, expired
            $table->text('reason')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->index(['booking_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_reschedule_requests');
    }
};
