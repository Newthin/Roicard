<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->foreignId('subscription_id')->nullable()->after('plan_id')->constrained()->nullOnDelete();

            // initial | renewal | upgrade | legacy_activation | admin_grant
            $table->string('purpose', 30)->default('initial')->after('method');

            // The billing period this payment covers. Stored on the payment so
            // a delayed webhook applies exactly what was quoted at checkout.
            $table->timestamp('period_start')->nullable()->after('purpose');
            $table->timestamp('period_end')->nullable()->after('period_start');

            $table->json('meta')->nullable()->after('period_end');

            $table->index(['user_id', 'status']);
            $table->index('purpose');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status']);
            $table->dropIndex(['purpose']);
            $table->dropConstrainedForeignId('subscription_id');
            $table->dropConstrainedForeignId('plan_id');
            $table->dropColumn(['purpose', 'period_start', 'period_end', 'meta']);
        });
    }
};
