<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin broadcast history: one row per announcement sent to all / filtered /
 * a single user. Created as a DRAFT (status draft|sending|sent) and only
 * delivered on an explicit start; the targeting is kept verbatim in `filters`
 * (text + array cast); `started_at` is stamped when the creator starts it;
 * `recipients_count`/`completed_at` by the fan-out job. Drafts are soft-deletable.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('broadcasts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('administrator_id')->index();
            $table->string('status')->default('draft')->index();
            $table->string('title');
            $table->text('body');
            $table->text('filters')->nullable();
            $table->unsignedInteger('recipients_count')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('broadcasts');
    }
};
