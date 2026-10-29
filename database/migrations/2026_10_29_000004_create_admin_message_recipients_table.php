<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_message_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_message_id')->constrained('admin_messages')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('email', 255);
            $table->string('name', 255)->nullable();
            $table->string('status', 20)->default('queued')->index();
            $table->text('error')->nullable();
            $table->string('resend_email_id', 191)->nullable();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            // The hard double-send guard: a user can appear only once in a
            // message, even if the dispatcher is retried.
            $table->unique(['admin_message_id', 'user_id']);
            $table->index(['admin_message_id', 'status']);
            $table->index('email');
            $table->index('sent_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_message_recipients');
    }
};
