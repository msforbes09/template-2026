<?php

namespace Tests\Feature\Console;

use App\Models\Users\User;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifies the dev/QA demo-users seeder produces a spread across every status.
 */
class DemoUsersSeederTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Seeding creates recognisable accounts in each status bucket.
     */
    public function test_seeds_a_spread_of_statuses(): void
    {
        $this->seed(DemoUsersSeeder::class);

        // 3 per bucket; completed carries one extra variant (the inactive account).
        $expected = ['draft' => 3, 'completed' => 4];
        foreach ($expected as $status => $count) {
            $this->assertSame($count, User::where('status', $status)->count(), "unexpected {$status} count");
        }

        $this->assertSame(1, User::where('is_active', false)->count());
        $this->assertSame(7, User::count());
    }

    /**
     * Every website account is email-verified; completed+ accounts carry a full
     * address + profile-completion stamp, while draft is deliberately incomplete.
     */
    public function test_completeness_matches_status(): void
    {
        $this->seed(DemoUsersSeeder::class);

        // All website registrants verified their email at sign-up.
        $this->assertSame(0, User::whereNull('email_verified_at')->count());

        // Every account has logged in.
        $this->assertSame(0, User::whereNull('last_login_at')->count());

        $completed = User::whereHashed('email', 'demo.completed.1@example.test')->firstOrFail();
        $this->assertNotNull($completed->profile_completed_at);
        $this->assertNotNull($completed->address_line_one);
        $this->assertNotNull($completed->region_code);
        $this->assertNotNull($completed->barangay_code);
        $this->assertNotNull($completed->details_changed_at);
        $this->assertNotNull($completed->last_login_at);

        $draft = User::whereHashed('email', 'demo.draft.1@example.test')->firstOrFail();
        $this->assertNotNull($draft->email_verified_at);   // registered
        $this->assertNotNull($draft->last_login_at);        // signed in
        $this->assertNull($draft->profile_completed_at);   // but incomplete
        $this->assertNull($draft->address_line_one);
    }

    /**
     * The seeder is safely re-runnable — a second run replaces the demo rows rather
     * than colliding on the fixed emails.
     */
    public function test_is_re_runnable(): void
    {
        $this->seed(DemoUsersSeeder::class);
        $first = User::count();

        $this->seed(DemoUsersSeeder::class);

        $this->assertSame($first, User::count()); // replaced, not duplicated
    }
}
