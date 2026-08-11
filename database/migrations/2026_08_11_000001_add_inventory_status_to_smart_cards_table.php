<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('smart_cards', function (Blueprint $table) {
            // Drop the NOT NULL FK so cards can exist "available"/"unassigned"
            // without a member, then re-add it as nullable.
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            // Inventory lifecycle: available, assigned, active, deactivated
            $table->string('inventory_status')->default('available')->after('status');
            $table->timestamp('assigned_at')->nullable()->after('inventory_status');

            // Delivery details only apply once a member orders a physical
            // card — make them nullable so registered inventory is valid.
            $table->string('delivery_name')->nullable()->change();
            $table->string('street_address')->nullable()->change();
            $table->string('city')->nullable()->change();
            $table->string('region')->nullable()->change();
            $table->string('delivery_phone')->nullable()->change();
        });

        // Backfill existing cards already linked to a member as "assigned".
        \Illuminate\Support\Facades\DB::table('smart_cards')
            ->whereNotNull('user_id')
            ->where('inventory_status', 'available')
            ->update(['inventory_status' => 'assigned', 'assigned_at' => \Illuminate\Support\Facades\DB::raw('COALESCE(dispatched_at, created_at)')]);
    }

    public function down(): void
    {
        Schema::table('smart_cards', function (Blueprint $table) {
            $table->string('delivery_name')->nullable(false)->change();
            $table->string('street_address')->nullable(false)->change();
            $table->string('city')->nullable(false)->change();
            $table->string('region')->nullable(false)->change();
            $table->string('delivery_phone')->nullable(false)->change();
            $table->dropColumn(['assigned_at', 'inventory_status']);
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};