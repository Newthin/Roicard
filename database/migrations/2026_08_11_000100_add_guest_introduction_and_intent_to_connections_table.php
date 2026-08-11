<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('connections', function (Blueprint $table) {
            $table->text('guest_introduction')->nullable()->after('guest_meeting_context');
            $table->text('guest_intent')->nullable()->after('guest_introduction');
        });
    }

    public function down(): void
    {
        Schema::table('connections', function (Blueprint $table) {
            $table->dropColumn(['guest_introduction', 'guest_intent']);
        });
    }
};