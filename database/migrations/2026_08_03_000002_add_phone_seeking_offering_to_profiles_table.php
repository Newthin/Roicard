<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('whatsapp_phone');
            $table->text('seeking')->nullable()->after('bio');
            $table->text('offering')->nullable()->after('seeking');
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn(['phone', 'seeking', 'offering']);
        });
    }
};
