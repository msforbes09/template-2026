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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->index();
            $table->string('password')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('mobile_number_verified_at')->nullable();   // reserved: mobile is a plain contact field, never verified

            // Encrypted PII — the values (names, email, mobile_number, birth_date,
            // address lines, postal_code) live only in `ciphertext`. The `*_hash`
            // columns are keyed-HMAC blind indexes for exact-match lookups.
            $table->text('ciphertext')->nullable();
            $table->string('email_hash')->nullable()->index();
            $table->string('first_name_hash')->nullable()->index();
            $table->string('last_name_hash')->nullable()->index();
            $table->string('mobile_number_hash')->nullable()->index();

            $table->string('gender', 10)->nullable();
            $table->string('citizenship_code', 5)->nullable();
            $table->string('country_code', 5)->nullable();
            $table->string('region_code', 20)->nullable();
            $table->string('province_code', 20)->nullable();
            $table->string('municipality_code', 20)->nullable();
            $table->string('barangay_code', 20)->nullable();
            $table->string('photo_uuid')->nullable();
            $table->text('meta')->nullable();                           // array cast — internal metadata
            $table->string('status', 20)->nullable()->index();          // default set app-level (User model): draft -> completed

            // When the profile was completed (draft -> completed). Also the anchor
            // both edit-cooldown clocks start from.
            $table->dateTime('profile_completed_at')->nullable();
            $table->dateTime('details_changed_at')->nullable();         // last profile-details change while cooldown applies
            $table->dateTime('photo_changed_at')->nullable();           // last photo change while cooldown applies

            $table->boolean('is_active')->default(true)->index();
            $table->string('registration_method', 20)->nullable()->index();
            $table->string('authentication_method', 20)->nullable()->index();
            $table->string('authentication_channel', 10)->nullable()->index(); // reserved: unused since auth became email-only
            $table->timestamp('last_login_at')->nullable();
            $table->string('auth_token')->nullable()->index();          // hashed pending-2FA handle
            $table->timestamp('auth_token_expires_at')->nullable();     // handshake expiry (fail closed)
            $table->text('trusted_devices')->nullable();                // array cast: [{device: sha256, trusted_at}]
            $table->timestamps();
            $table->softDeletes()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
