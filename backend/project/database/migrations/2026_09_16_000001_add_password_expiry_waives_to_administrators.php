<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * How many times an administrator has postponed an expired password since it
 * was last changed, and until when the latest postponement holds. Both reset
 * on every password change.
 */
return new class extends Migration
{
    /**
     * Run the migration.
     */
    public function up(): void
    {
        Schema::table('administrators', function (Blueprint $table) {
            $table->unsignedTinyInteger('password_expiry_waives')->default(0)->after('password_changed_at');
            $table->timestamp('password_expiry_waived_until')->nullable()->after('password_expiry_waives');
        });
    }

    /**
     * Reverse the migration.
     */
    public function down(): void
    {
        Schema::table('administrators', function (Blueprint $table) {
            $table->dropColumn(['password_expiry_waives', 'password_expiry_waived_until']);
        });
    }
};
