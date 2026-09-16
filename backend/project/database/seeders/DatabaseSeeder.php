<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * The seeders every environment runs: roles/permissions. Address reference data
 * (AddressSeeder) and demo data (DemoUsersSeeder) are run explicitly, never chained here.
 */
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(AccessSeeder::class);

        // AddressSeeder loads the full PSGC dataset; run it once per environment:
        // `php artisan db:seed --class=AddressSeeder`.
    }
}
