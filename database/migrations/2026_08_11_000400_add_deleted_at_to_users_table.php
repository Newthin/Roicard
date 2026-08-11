<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Soft deletes on users so accounts (and cascade-owned data) survive for a
 * retention window after deletion — self-delete or admin-delete — before a
 * scheduled purge permanently removes them. Keeps data available for
 * investigation without exposing the account to login or public views.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
