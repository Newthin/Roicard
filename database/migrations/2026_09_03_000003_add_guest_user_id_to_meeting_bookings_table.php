<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meeting_bookings', function (Blueprint $table) {
            $table->foreignId('guest_user_id')->nullable()->after('host_user_id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('meeting_bookings', function (Blueprint $table) {
            $table->dropForeign(['guest_user_id']);
            $table->dropColumn('guest_user_id');
        });
    }
};
