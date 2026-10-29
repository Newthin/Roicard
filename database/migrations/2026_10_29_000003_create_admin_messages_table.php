<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('subject', 200);
            $table->text('body');
            // service = outage/maintenance notice, nudge = activation prompt
            $table->string('category', 20)->default('service');
            $table->json('filter_snapshot')->nullable();
            $table->unsignedInteger('recipient_count')->default(0);
            // Recipients suppressed because they already received this subject
            // within the duplicate window. Kept separate so the UI can explain
            // why the send count is lower than the preview count.
            $table->unsignedInteger('skipped_count')->default(0);
            $table->unsignedInteger('queued_count')->default(0);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->string('status', 20)->default('queued')->index();
            $table->string('idempotency_key', 255)->nullable()->unique();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_messages');
    }
};
