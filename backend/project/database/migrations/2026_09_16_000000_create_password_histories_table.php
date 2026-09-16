<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * One row per password ever set on an administrator or user, so recent
 * passwords cannot be reused; plus a `password_changed_at` stamp on both
 * accounts so the age of the current password is known.
 *
 * Backfills a history row per existing account from its current hash and stamps
 * `password_changed_at` from `updated_at`, so the reuse, minimum-age and expiry
 * checks have a baseline on deploy day instead of treating every account as new.
 */
return new class extends Migration
{
    /**
     * Run the migration.
     */
    public function up(): void
    {
        Schema::create('password_histories', function (Blueprint $table) {
            $table->id();
            $table->string('owner_type')->index();
            $table->string('owner_id')->index();
            $table->string('password');
            $table->timestamps();
        });

        $now = now();

        foreach (['Administrator' => 'administrators', 'User' => 'users'] as $type => $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->timestamp('password_changed_at')->nullable()->after('password');
            });

            DB::table($tableName)->whereNotNull('password')->update(['password_changed_at' => DB::raw('updated_at')]);

            DB::table($tableName)
                ->select(['id', 'password'])
                ->whereNotNull('password')
                ->orderBy('id')
                ->chunk(500, function ($rows) use ($type, $now) {
                    DB::table('password_histories')->insert($rows->map(fn ($row) => [
                        'owner_type' => $type,
                        'owner_id' => (string) $row->id,
                        'password' => $row->password,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])->all());
                });
        }
    }

    /**
     * Reverse the migration.
     */
    public function down(): void
    {
        Schema::dropIfExists('password_histories');

        foreach (['administrators', 'users'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn('password_changed_at');
            });
        }
    }
};
