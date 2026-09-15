<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('administrators', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('photo_uuid')->nullable();
            $table->string('password');
            $table->boolean('with_temporary_password')->default(true);
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('is_developer')->default(false);
            $table->timestamp('last_login_at')->nullable();
            $table->string('auth_token')->nullable()->index();
            $table->timestamp('auth_validated')->nullable();
            $table->string('trusted_device')->nullable();
            $table->timestamps();
            $table->softDeletes()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('administrators');
    }
};
