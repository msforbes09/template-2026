<?php

namespace Tests\Feature\Security;

use App\Events\Administrators\TemporaryPasswordIssued;
use App\Events\Otp\OtpIssued;
use App\Models\Administrators\Administrator;
use App\Services\Otp\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Secrets and user PII must not sit in plaintext at rest.
 *
 * The users table already encrypts PII behind a keyed HMAC blind index — but the
 * queue serialised temporary passwords and OTP PINs into the jobs table.
 * Encrypting the front door achieves little while the back door is open.
 */
class PlaintextAtRestTest extends TestCase
{
    use RefreshDatabase;

    /**
     * FINDING 15 — a queued listener serialises its event into the jobs table, so the
     * plaintext temporary password sat in the database until the job ran, and forever
     * if it failed.
     */
    public function test_a_temporary_password_is_not_plaintext_in_the_queue(): void
    {
        config(['queue.default' => 'database']);

        $admin = Administrator::factory()->create();

        TemporaryPasswordIssued::dispatch($admin, 'Sup3rSecret-Temp-Pass');

        $payloads = DB::table('jobs')->pluck('payload')->implode(' ');

        $this->assertNotSame('', $payloads, 'The job should have been queued.');
        $this->assertStringNotContainsString('Sup3rSecret-Temp-Pass', $payloads);
    }

    /**
     * The same bug, one the scanner missed: the OTP listener is queued too, so the
     * plaintext PIN was written to the jobs table — a live second factor, stored
     * hashed in `otps` precisely so it could not be read, and then put back in the
     * clear next door.
     */
    public function test_an_otp_pin_is_not_plaintext_in_the_queue(): void
    {
        config(['queue.default' => 'database']);

        $admin = Administrator::factory()->create();

        $otp = app(OtpService::class)->generate('admin_2fa', $admin->email, $admin);
        OtpIssued::dispatch($otp);

        $pin = $otp->pin;

        $payloads = DB::table('jobs')->pluck('payload')->implode(' ');

        $this->assertNotSame('', $payloads, 'The job should have been queued.');
        $this->assertStringNotContainsString($pin, $payloads);
    }
}
