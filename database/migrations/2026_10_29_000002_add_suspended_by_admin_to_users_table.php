<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Distinguishes an administrative suspension from a member's own account
 * deactivation. Both hide the profile and block sign-in, but only
 * self-deactivation may be undone by the member through /auth/reactivate —
 * otherwise a suspended member could simply lift an admin block with their
 * password.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('suspended_by_admin')->default(false)->after('deactivated_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('suspended_by_admin');
        });
    }
};
