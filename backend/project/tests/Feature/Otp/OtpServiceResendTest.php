<?php

namespace Tests\Feature\Otp;

use App\Exceptions\OtpLockedException;
use App\Exceptions\OtpThrottledException;
use App\Models\Misc\Otps\Otp;
use App\Services\Otp\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Tests for OtpService::resend().
 */
class OtpServiceResendTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Resending within the cooldown is throttled.
     */
    public function test_resend_within_cooldown_is_throttled(): void
    {
        $service = app(OtpService::class);
        $token = $service->generate('admin_2fa', 'ada@admin.test')->resendToken;

        $this->expectException(OtpThrottledException::class);
        $service->resend($token);
    }

    /**
     * After the cooldown, resend issues a new PIN and keeps the same token.
     */
    public function test_resend_after_cooldown_issues_new_pin(): void
    {
        $service = app(OtpService::class);
        $first = $service->generate('admin_2fa', 'ada@admin.test');
        Otp::query()->update(['updated_at' => now()->subMinutes(5)]);

        $second = $service->resend($first->resendToken);

        $this->assertSame($first->resendToken, $second->resendToken);
        $otp = Otp::sole();
        $this->assertTrue(Hash::check($second->pin, $otp->hashed_pin));
        $this->assertFalse(Hash::check($first->pin, $otp->hashed_pin));
    }

    /**
     * Exceeding max_resends locks the OTP.
     */
    public function test_exceeding_max_resends_locks(): void
    {
        config(['otp.max_resends' => 1]);
        $service = app(OtpService::class);
        $token = $service->generate('admin_2fa', 'ada@admin.test')->resendToken;

        Otp::query()->update(['updated_at' => now()->subMinutes(5)]);
        $service->resend($token);                 // resend_count -> 1 (ok)

        Otp::query()->update(['updated_at' => now()->subMinutes(5)]);
        $this->expectException(OtpLockedException::class);
        $service->resend($token);                 // would be 2 > 1 -> locked
    }
}
