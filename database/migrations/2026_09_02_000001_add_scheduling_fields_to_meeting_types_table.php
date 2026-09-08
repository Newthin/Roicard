<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meeting_types', function (Blueprint $table) {
            $table->unsignedSmallInteger('min_notice_hours')->default(2);
            $table->unsignedSmallInteger('advance_booking_days')->default(30);
            $table->unsignedSmallInteger('max_bookings_per_day')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('meeting_types', function (Blueprint $table) {
            $table->dropColumn(['min_notice_hours', 'advance_booking_days', 'max_bookings_per_day']);
        });
    }
};
