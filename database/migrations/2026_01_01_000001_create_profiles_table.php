<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->string('organisation')->nullable();
            $table->string('whatsapp_phone')->nullable();
            $table->string('location')->nullable();
            $table->text('bio')->nullable();
            $table->string('slug')->unique()->nullable();
            $table->boolean('is_live')->default(false);
            $table->unsignedTinyInteger('completion_pct')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
