<?php

namespace Database\Seeders;

use App\Enums\UserStatusEnum;
use App\Models\Addresses\Barangays\Barangay;
use App\Models\Users\User;
use Illuminate\Database\Seeder;

/**
 * Dev/QA data: creates a spread of website accounts across every status (and an
 * inactive variant) so the admin lists and filters have realistic rows to work
 * with. Emails are recognisable (`demo.<status>.N@…`).
 *
 * NOT chained into DatabaseSeeder and refuses to run in production — it is fake
 * data, run explicitly: `php artisan db:seed --class=DemoUsersSeeder`.
 */
class DemoUsersSeeder extends Seeder
{
    /**
     * How many accounts to create per status bucket.
     */
    private const PER_STATUS = 3;

    /**
     * Seed the demo users.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->warn('DemoUsersSeeder is disabled in production — skipped.');

            return;
        }

        // A complete, resolvable address — pulled from the seeded PSGC tables if
        // present (so it renders real names), else a fixed fallback chain. Applied to
        // every bucket EXCEPT draft (the only genuinely incomplete profile).
        $address = $this->completeAddress();

        // status => base attributes.
        $buckets = [
            'draft' => ['status' => UserStatusEnum::DRAFT->value, 'profile_completed_at' => null],
            'completed' => ['status' => UserStatusEnum::COMPLETED->value, ...$address],
        ];

        // Website registrants verify their email at sign-up (verify-before-create) and
        // land signed in, so every demo account has email_verified_at + last_login_at —
        // even the draft, which is "registered but hasn't completed its profile".
        $base = [
            'registration_method' => 'website',
            'authentication_method' => 'website',
            'authentication_channel' => 'email',
            'email_verified_at' => now(),
            'last_login_at' => now()->subHours(rand(1, 240)),
        ];

        $created = 0;

        foreach ($buckets as $label => $attributes) {
            for ($i = 1; $i <= self::PER_STATUS; $i++) {
                $this->make("demo.{$label}.{$i}@example.test", [...$base, ...$attributes]);
                $created++;
            }
        }

        // A deactivated account with a complete profile, for the admin views.
        $this->make('demo.inactive.1@example.test', [
            ...$base,
            'status' => UserStatusEnum::COMPLETED->value, 'is_active' => false,
            ...$address,
        ]);
        $created++;

        $this->command?->info("DemoUsersSeeder: created {$created} demo users across ".count($buckets).' statuses (+ inactive).');
    }

    /**
     * Create a demo user, first removing any prior one with the same email (matched
     * on the blind index, including soft-deleted) so the seeder is safely re-runnable
     * despite the fixed demo emails.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function make(string $email, array $attributes): void
    {
        User::withTrashed()->whereHashed('email', $email)->forceDelete();

        User::factory()->create(['email' => $email, ...$attributes]);
    }

    /**
     * A complete, PSGC-consistent address for a finished profile — the required
     * address fields (region/province/municipality/barangay + line + postal) plus a
     * profile-completion stamp. Uses a real seeded barangay when the reference tables
     * are populated (so the address resolves to real names), else a fixed fallback.
     *
     * @return array<string, mixed>
     */
    private function completeAddress(): array
    {
        $barangay = Barangay::query()->first();

        $codes = $barangay
            ? [
                'region_code' => $barangay->region_code,
                'province_code' => $barangay->province_code,
                'municipality_code' => $barangay->municipality_code,
                'barangay_code' => $barangay->code,
                'postal_code' => (string) ($barangay->zip_code ?? '2404'),
            ]
            : [
                'region_code' => '0100000000',
                'province_code' => '0105500000',
                'municipality_code' => '0105503000',
                'barangay_code' => '0105503021',
                'postal_code' => '2404',
            ];

        return [
            'country_code' => 'PH',
            'citizenship_code' => 'PH',
            'address_line_one' => '123 Main St.',
            'address_line_two' => 'Unit 4B',
            ...$codes,
            'profile_completed_at' => now()->subDays(rand(2, 40)),
            // A completed profile has both channels verified and its edit-cooldown
            // clocks stamped (the details were set at completion).
            'mobile_number_verified_at' => now()->subDays(rand(2, 40)),
            'details_changed_at' => now()->subDays(rand(2, 40)),
        ];
    }
}
