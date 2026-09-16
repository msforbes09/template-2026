<?php

namespace Tests\Feature\Otp;

use App\Exceptions\InvalidOtpException;
use App\Exceptions\OtpLockedException;
use App\Exceptions\OtpThrottledException;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Tests the JSON envelopes rendered by the OTP exceptions.
 */
class OtpExceptionsTest extends TestCase
{
    /**
     * InvalidOtpException renders 400 with the remaining attempts in meta.
     */
    public function test_invalid_otp_renders_400_with_remaining_in_meta(): void
    {
        Route::get('/__invalid_otp', fn () => throw new InvalidOtpException(3));

        $this->getJson('/__invalid_otp')
            ->assertStatus(400)
            ->assertJson(['error' => 'invalid_otp', 'meta' => ['remaining_attempts' => 3]]);
    }

    /**
     * OtpThrottledException renders 429 with retry_after meta.
     */
    public function test_throttled_renders_429_with_retry_after(): void
    {
        Route::get('/__otp_throttled', fn () => throw new OtpThrottledException(42));

        $this->getJson('/__otp_throttled')
            ->assertStatus(429)
            ->assertJson(['error' => 'otp_throttled', 'meta' => ['retry_after' => 42]]);
    }

    /**
     * OtpLockedException renders 429 with retry_after meta.
     */
    public function test_locked_renders_429_with_retry_after(): void
    {
        Route::get('/__otp_locked', fn () => throw new OtpLockedException(900));

        $this->getJson('/__otp_locked')
            ->assertStatus(429)
            ->assertJson(['error' => 'otp_locked', 'meta' => ['retry_after' => 900]]);
    }
}
