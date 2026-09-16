<?php

namespace Database\Seeders;

use App\Models\Addresses\Countries\Country;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Loads the address reference data (countries + PSGC) from the bundled SQL
 * dumps. MySQL-targeted; run in deployment (`db:seed --class=AddressSeeder`),
 * not part of the default seeder. Skips when already populated.
 */
class AddressSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (Country::query()->exists()) {
            $this->command?->info('Address reference data already present; skipping.');

            return;
        }

        $dir = database_path('seeders/data/addresses');

        DB::unprepared(File::get("{$dir}/countries.sql"));
        DB::unprepared(File::get("{$dir}/psgc.sql"));

        $this->command?->info('Address reference data seeded.');
    }
}
