<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meeting_types', function (Blueprint $table) {
            // Bookings allowed right up to the slot start (a minute before).
            $table->unsignedSmallInteger('min_notice_hours')->default(0)->change();
            // NULL = no advance-booking limit.
            $table->unsignedSmallInteger('advance_booking_days')->nullable()->default(null)->change();
        });

        // Remove restrictions from existing meeting types.
        \DB::table('meeting_types')->update([
            'min_notice_hours' => 0,
            'advance_booking_days' => null,
        ]);
    }

    public function down(): void
    {
        Schema::table('meeting_types', function (Blueprint $table) {
            $table->unsignedSmallInteger('min_notice_hours')->default(2)->change();
            $table->unsignedSmallInteger('advance_booking_days')->default(30)->change();
        });
    }
};
