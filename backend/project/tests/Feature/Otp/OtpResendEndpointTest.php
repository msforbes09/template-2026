<?php

namespace Tests\Feature\Otp;

use App\Mail\Administrators\Admin2faOtpMail;
use App\Models\Administrators\Administrator;
use App\Models\Misc\Otps\Otp;
use App\Services\Otp\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Tests the generic otp/resend endpoint.
 */
class OtpResendEndpointTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A valid resend_token (past cooldown) re-queues the mail.
     */
    public function test_resend_requeues_the_mail(): void
    {
        Mail::fake();
        $admin = Administrator::factory()->create(['email' => 'ada@admin.test']);
        $token = app(OtpService::class)->generate('admin_2fa', 'ada@admin.test', $admin)->resendToken;
        Otp::query()->update(['updated_at' => now()->subMinutes(5)]);

        $this->postJson('/api/v1/common/otp/resend', ['resend_token' => $token])
            ->assertOk()
            ->assertJsonStructure(['resend_token', 'retry_after']);

        Mail::assertSent(Admin2faOtpMail::class);
    }

    /**
     * Resending within the cooldown is throttled.
     */
    public function test_resend_within_cooldown_is_throttled(): void
    {
        Mail::fake();
        $admin = Administrator::factory()->create(['email' => 'ada@admin.test']);
        $token = app(OtpService::class)->generate('admin_2fa', 'ada@admin.test', $admin)->resendToken;

        $this->postJson('/api/v1/common/otp/resend', ['resend_token' => $token])
            ->assertStatus(429)
            ->assertJsonPath('error', 'otp_throttled');
    }
}
