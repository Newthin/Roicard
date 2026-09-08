<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_type_id')->constrained()->cascadeOnDelete();
            $table->foreignId('host_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('pending');
            // Guest information (supports unauthenticated guests)
            $table->string('guest_name');
            $table->string('guest_email');
            $table->string('guest_phone')->nullable();
            $table->text('guest_notes')->nullable();
            $table->string('guest_cancellation_token', 64)->unique();
            // Meeting times (UTC)
            $table->timestamp('start_time');
            $table->timestamp('end_time');
            // Timezone snapshot at booking time
            $table->string('timezone', 50);
            $table->string('host_timezone', 50)->nullable();
            // Snapshot of meeting type at booking time (preserved for historical accuracy)
            $table->string('type_name');
            $table->text('type_description')->nullable();
            $table->unsignedSmallInteger('type_duration_minutes');
            $table->string('type_format');
            $table->string('type_location_detail')->nullable();
            // Cancellation
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancelled_by')->nullable(); // 'host', 'guest'
            $table->string('cancellation_reason')->nullable();
            // Confirmation
            $table->timestamp('confirmed_at')->nullable();
            $table->text('host_notes')->nullable();
            $table->timestamps();

            $table->index(['host_user_id', 'status']);
            $table->index(['guest_email']);
            $table->index(['start_time', 'status']);
            $table->index(['meeting_type_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_bookings');
    }
};
