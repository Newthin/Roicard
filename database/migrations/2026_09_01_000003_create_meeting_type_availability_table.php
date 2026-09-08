<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_type_availability', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_type_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0=Sun .. 6=Sat
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();

            $table->index(['meeting_type_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_type_availability');
    }
};
