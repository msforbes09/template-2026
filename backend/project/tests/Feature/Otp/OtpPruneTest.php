<?php

namespace Tests\Feature\Otp;

use App\Models\Misc\Otps\Otp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests that pruning removes only expired, unlocked OTPs.
 */
class OtpPruneTest extends TestCase
{
    use RefreshDatabase;

    /**
     * model:prune deletes expired unlocked rows and keeps live or locked ones.
     */
    public function test_prune_removes_only_expired_unlocked(): void
    {
        Otp::factory()->create(['expires_at' => now()->subDay()]);                                    // pruned
        Otp::factory()->create(['expires_at' => now()->subDay(), 'locked_until' => now()->addHour()]); // kept (locked)
        Otp::factory()->create(['expires_at' => now()->addMinutes(5)]);                               // kept (live)

        $this->artisan('model:prune', ['--model' => [Otp::class]])->assertSuccessful();

        $this->assertSame(2, Otp::count());
    }
}
