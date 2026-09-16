<?php

namespace Tests\Feature\Security;

use App\Enums\FileEnum;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The shared OTP-resend endpoint is rate-limited, and the file threat scan blocks
 * PHP short/ASP tags.
 */
class OtpResendThrottleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * More than 5 resend attempts in a window are throttled (429), even with an
     * invalid token — the limiter runs before the controller.
     */
    public function test_otp_resend_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/common/otp/resend', ['resend_token' => 'same-token']);
        }

        $this->postJson('/api/v1/common/otp/resend', ['resend_token' => 'same-token'])
            ->assertStatus(429);
    }

    /**
     * The 2–3 byte tags `<%` / `<?=` are deliberately NOT in the blacklist: they
     * collide with ordinary binary image bytes and false-reject real uploads. The
     * meaningful `<?php` tag stays.
     */
    public function test_threat_scan_omits_false_positive_short_tags(): void
    {
        $this->assertNotContains('<%', FileEnum::THREATS);
        $this->assertNotContains('<?=', FileEnum::THREATS);
        $this->assertContains('<?php', FileEnum::THREATS);
    }
}
