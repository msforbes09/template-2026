<?php

namespace Tests\Feature\Otp;

use App\Exceptions\InvalidOtpException;
use App\Exceptions\OtpLockedException;
use App\Models\Misc\Otps\Otp;
use App\Services\Otp\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests for OtpService::verify().
 */
class OtpServiceVerifyTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A correct PIN verifies and consumes the OTP.
     */
    public function test_correct_pin_verifies_and_consumes(): void
    {
        $service = app(OtpService::class);
        $pin = $service->generate('admin_2fa', 'ada@admin.test')->pin;

        $result = $service->verify('admin_2fa', 'ada@admin.test', $pin);

        $this->assertSame('ada@admin.test', $result->identifier);
        $this->assertSame(0, Otp::count());
    }

    /**
     * A wrong PIN reports the remaining attempts in the exception meta.
     */
    public function test_wrong_pin_reports_remaining_attempts(): void
    {
        config(['otp.max_attempts' => 5]);
        $service = app(OtpService::class);
        $service->generate('admin_2fa', 'ada@admin.test');

        try {
            $service->verify('admin_2fa', 'ada@admin.test', '000000');
            $this->fail('Expected InvalidOtpException.');
        } catch (InvalidOtpException $e) {
            $this->assertSame(4, $e->getMeta()['remaining_attempts']);
        }
    }

    /**
     * On enumeration-prone flows (revealAttempts=false) a wrong PIN throws with NO
     * meta — identical to the missing/expired-row envelope — so the failure never
     * signals whether the identifier's OTP row (hence the account) exists.
     */
    public function test_wrong_pin_hides_remaining_attempts_when_suppressed(): void
    {
        config(['otp.max_attempts' => 5]);
        $service = app(OtpService::class);
        $service->generate('user_registration', 'alex@user.test');

        try {
            $service->verify('user_registration', 'alex@user.test', '000000', revealAttempts: false);
            $this->fail('Expected InvalidOtpException.');
        } catch (InvalidOtpException $e) {
            $this->assertNull($e->getMeta());
        }

        // The missing-row case throws the identical envelope.
        try {
            $service->verify('user_registration', 'nobody@user.test', '000000', revealAttempts: false);
            $this->fail('Expected InvalidOtpException.');
        } catch (InvalidOtpException $e) {
            $this->assertNull($e->getMeta());
        }
    }

    /**
     * Exhausting attempts locks the OTP.
     */
    public function test_exhausting_attempts_locks(): void
    {
        config(['otp.max_attempts' => 2]);
        $service = app(OtpService::class);
        $service->generate('admin_2fa', 'ada@admin.test');

        $this->tryWrongPin($service);          // attempt 1 -> InvalidOtp
        $this->expectException(OtpLockedException::class);
        $this->tryWrongPin($service);          // attempt 2 -> locked
    }

    /**
     * An expired OTP is invalid.
     */
    public function test_expired_otp_is_invalid(): void
    {
        $service = app(OtpService::class);
        $service->generate('admin_2fa', 'ada@admin.test');
        Otp::query()->update(['expires_at' => now()->subMinute()]);

        $this->expectException(InvalidOtpException::class);
        $service->verify('admin_2fa', 'ada@admin.test', '000000');
    }

    /**
     * Submit a deliberately wrong PIN, swallowing the InvalidOtpException.
     */
    private function tryWrongPin(OtpService $service): void
    {
        try {
            $service->verify('admin_2fa', 'ada@admin.test', '000000');
        } catch (InvalidOtpException $e) {
            // expected for non-final attempts
        }
    }
}
