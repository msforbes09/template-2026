<?php

namespace Tests\Feature\Otp;

use App\Models\Administrators\Administrator;
use App\Models\Misc\Otps\Otp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests for the Otp model: casts, morph owner, and the prune query.
 */
class OtpModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The Otp casts datetimes and resolves its polymorphic owner.
     */
    public function test_it_casts_dates_and_resolves_otpable(): void
    {
        $admin = Administrator::factory()->create();
        $otp = Otp::factory()->create(['expires_at' => now()->addMinutes(5)]);
        $otp->otpable()->associate($admin)->save();

        $this->assertTrue($otp->fresh()->expires_at->isFuture());
        $this->assertTrue($otp->fresh()->otpable->is($admin));
    }

    /**
     * prunable() selects expired, unlocked rows and excludes live or locked ones.
     */
    public function test_prunable_selects_only_expired_unlocked_rows(): void
    {
        $expired = Otp::factory()->create(['expires_at' => now()->subDay()]);
        Otp::factory()->create(['expires_at' => now()->subDay(), 'locked_until' => now()->addHour()]);
        Otp::factory()->create(['expires_at' => now()->addMinutes(5)]);

        $prunable = (new Otp)->prunable()->pluck('id');

        $this->assertTrue($prunable->contains($expired->id));
        $this->assertCount(1, $prunable);
    }
}
