<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creates the PSGC address reference tables (countries + Philippine geographic
 * codes). Reference data — no timestamps, no soft deletes, no foreign keys.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('countries', function (Blueprint $table) {
            $table->id();
            $table->string('code', 2)->index();
            $table->string('alpha_3_code', 3)->nullable();
            $table->string('name', 100);
            $table->string('nationality', 100);
        });

        Schema::create('regions', function (Blueprint $table) {
            $table->string('code', 20)->primary();
            $table->string('correspondence_code', 20)->nullable()->index();
            $table->string('name', 60);
        });

        Schema::create('provinces', function (Blueprint $table) {
            $table->string('code', 20)->primary();
            $table->string('correspondence_code', 20)->nullable()->index();
            $table->string('region_code', 20)->index();
            $table->string('name', 60);
        });

        Schema::create('municipalities', function (Blueprint $table) {
            $table->string('code', 20)->primary();
            $table->string('correspondence_code', 20)->nullable()->index();
            $table->string('region_code', 20)->index();
            $table->string('province_code', 20)->index();
            $table->string('name', 60);
            $table->string('zip_code', 20)->nullable();
            $table->boolean('is_sub')->default(false);
        });

        Schema::create('sub_municipalities', function (Blueprint $table) {
            $table->string('code', 20)->primary();
            $table->string('correspondence_code', 20)->nullable()->index();
            $table->string('region_code', 20)->index();
            $table->string('province_code', 20)->index();
            $table->string('municipality_code', 20)->index();
            $table->string('name', 60);
        });

        Schema::create('barangays', function (Blueprint $table) {
            $table->string('code', 20)->primary();
            $table->string('correspondence_code', 20)->nullable()->index();
            $table->string('region_code', 20)->index();
            $table->string('province_code', 20)->index();
            $table->string('municipality_code', 20)->index();
            $table->string('sub_municipality_code', 20)->nullable()->index();
            $table->string('zip_code', 20)->nullable();
            $table->string('name', 60);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('barangays');
        Schema::dropIfExists('sub_municipalities');
        Schema::dropIfExists('municipalities');
        Schema::dropIfExists('provinces');
        Schema::dropIfExists('regions');
        Schema::dropIfExists('countries');
    }
};
