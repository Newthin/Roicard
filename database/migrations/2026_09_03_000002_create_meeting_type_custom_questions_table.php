<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_type_custom_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_type_id')->constrained()->cascadeOnDelete();
            $table->string('question');
            $table->boolean('is_required')->default(false);
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['meeting_type_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_type_custom_questions');
    }
};
