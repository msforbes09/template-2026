<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bounds the administrator pending-2FA handshake handle with an expiry, matching
 * the user path — so a stale `auth_token` captured from a browser/proxy can no
 * longer be redeemed indefinitely at the 2FA completion endpoint (F/R3).
 */
return new class extends Migration
{
    /**
     * Run the migration.
     */
    public function up(): void
    {
        Schema::table('administrators', function (Blueprint $table) {
            $table->timestamp('auth_token_expires_at')->nullable()->after('auth_validated');
        });
    }

    /**
     * Reverse the migration.
     */
    public function down(): void
    {
        Schema::table('administrators', function (Blueprint $table) {
            $table->dropColumn('auth_token_expires_at');
        });
    }
};
