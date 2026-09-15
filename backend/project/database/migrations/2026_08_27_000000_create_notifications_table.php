<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The in-app notification center. Laravel's published notifications table,
 * edited to repo conventions: bigint auto-increment id (not uuid — the custom
 * DatabaseChannel drops the framework's stamped uuid), short string `type`
 * (never an FQCN — classes override databaseType()), morph columns indexed
 * inline, `data` as text with an array cast, no uniques and no foreign keys.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('type')->index();
            $table->string('notifiable_type')->index();
            $table->unsignedBigInteger('notifiable_id')->index();
            $table->text('data')->nullable();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
