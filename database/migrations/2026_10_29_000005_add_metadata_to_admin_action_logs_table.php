<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_action_logs', function (Blueprint $table) {
            // Structured context for new actions without changing existing
            // rows or the shape the activity feed already reads.
            $table->json('metadata')->nullable()->after('target_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('admin_action_logs', function (Blueprint $table) {
            $table->dropColumn('metadata');
        });
    }
};
