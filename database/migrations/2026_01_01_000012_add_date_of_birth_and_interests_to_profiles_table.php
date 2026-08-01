<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->after('whatsapp_phone');
            $table->enum('gender', ['male', 'female', 'prefer_not_to_say'])->nullable()->after('date_of_birth');
            $table->json('interests')->nullable()->after('gender');
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn(['date_of_birth', 'interests']);
        });
    }
};
