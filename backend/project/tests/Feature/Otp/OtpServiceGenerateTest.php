<?php

namespace Tests\Feature\Otp;

use App\Exceptions\OtpThrottledException;
use App\Models\Administrators\Administrator;
use App\Models\Misc\Otps\Otp;
use App\Services\Otp\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Tests for OtpService::generate().
 */
class OtpServiceGenerateTest extends TestCase
{
    use RefreshDatabase;

    /**
     * generate() creates a single hashed OTP and returns the plaintext PIN + token.
     */
    public function test_generate_creates_a_hashed_otp_and_returns_pin(): void
    {
        $admin = Administrator::factory()->create();

        $result = app(OtpService::class)->generate('admin_2fa', 'ada@admin.test', $admin);

        $this->assertMatchesRegularExpression('/^\d{6}$/', $result->pin);
        $this->assertNotEmpty($result->resendToken);
        $this->assertTrue($result->otpable->is($admin));

        $otp = Otp::where('type', 'admin_2fa')->where('identifier', 'ada@admin.test')->sole();
        $this->assertNotSame($result->pin, $otp->hashed_pin);
        $this->assertTrue(Hash::check($result->pin, $otp->hashed_pin));
    }

    /**
     * Re-generating for the same identifier keeps a single row (no blowup).
     */
    public function test_generate_keeps_one_row_per_identifier(): void
    {
        $service = app(OtpService::class);
        $service->generate('admin_2fa', 'ada@admin.test');

        // Move the row past the cooldown so a second generate is allowed.
        Otp::query()->update(['updated_at' => now()->subMinutes(5)]);

        $service->generate('admin_2fa', 'ada@admin.test');

        $this->assertSame(1, Otp::where('identifier', 'ada@admin.test')->count());
    }

    /**
     * Generating again within the cooldown is throttled.
     */
    public function test_generate_is_throttled_within_cooldown(): void
    {
        $service = app(OtpService::class);
        $service->generate('admin_2fa', 'ada@admin.test');

        $this->expectException(OtpThrottledException::class);
        $service->generate('admin_2fa', 'ada@admin.test');
    }
}
