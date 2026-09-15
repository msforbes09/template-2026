<?php

namespace Tests\Feature\Users\Registration;

use App\Enums\AuthChannelEnum;
use App\Models\Users\User;
use App\Services\Security\PiiCrypter;
use App\Services\Sms\SmsSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\Fakes\FakeSmsSender;
use Tests\TestCase;

/**
 * Website registration over the SMS channel (mobile-only accounts).
 */
class RegisterViaMobileTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The recording SMS double bound for the test.
     */
    private FakeSmsSender $sms;

    /**
     * Bind the recording SMS double in place of the real provider.
     */
    private function fakeSms(): void
    {
        $this->sms = new FakeSmsSender;
        $this->app->instance(SmsSender::class, $this->sms);
    }

    /**
     * Starting an SMS registration issues an SMS OTP keyed on the mobile number,
     * caches the payload, and persists no user.
     */
    public function test_start_registration_via_mobile_issues_sms_otp(): void
    {
        $this->fakeSms();

        $result = User::startRegistration([
            'channel' => 'sms',
            'mobile_number' => '+639171234567',
            'first_name' => 'Alex',
            'last_name' => 'Rivera',
            'company_name' => 'Acme Corp',
        ]);

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseHas('otps', ['type' => 'user_registration_sms', 'identifier' => '+639171234567']);
        $this->assertSame('+639171234567', Cache::get(User::registrationCacheKey('+639171234567'))['mobile_number']);
        // The PIN was delivered by SMS through the bound sender.
        $this->assertCount(1, $this->sms->sent);
        $this->assertStringContainsString($result->pin, $this->sms->sent[0]['message']);
        $this->assertSame('+639171234567', $this->sms->sent[0]['number']);
    }

    /**
     * Completing an SMS registration creates a mobile-only draft user: mobile set
     * and verified, email null, authentication_channel = sms.
     */
    public function test_completes_mobile_registration_creates_mobile_only_user(): void
    {
        $this->fakeSms();

        $result = User::startRegistration([
            'channel' => 'sms', 'mobile_number' => '+639171234567',
            'first_name' => 'Alex', 'last_name' => 'Rivera', 'company_name' => 'Acme Corp',
        ]);

        $token = User::completeRegistration('+639171234567', $result->pin, 'Secret@123', AuthChannelEnum::SMS);

        $this->assertNotEmpty($token);

        $user = User::first();
        $this->assertSame('+639171234567', $user->mobile_number);
        $this->assertNull($user->email);
        $this->assertNotNull($user->mobile_number_verified_at);
        $this->assertNull($user->email_verified_at);
        $this->assertSame('sms', $user->authentication_channel);
        $this->assertSame('draft', $user->status);
        $this->assertSame(app(PiiCrypter::class)->hash('+639171234567'), $user->getAttributes()['mobile_number_hash']);
    }

    /**
     * The register endpoint requires a mobile number when channel is sms.
     */
    public function test_register_endpoint_requires_mobile_number_for_sms(): void
    {
        $this->postJson('/api/v1/user/register', [
            'channel' => 'sms', 'first_name' => 'Alex', 'last_name' => 'Rivera', 'company_name' => 'Acme Corp',
        ])->assertStatus(422)->assertJsonValidationErrors(['mobile_number']);
    }

    /**
     * A malformed mobile number is rejected.
     */
    public function test_register_endpoint_rejects_bad_mobile_format(): void
    {
        $this->postJson('/api/v1/user/register', [
            'channel' => 'sms', 'mobile_number' => '09171234567',
            'first_name' => 'Alex', 'last_name' => 'Rivera', 'company_name' => 'Acme Corp',
        ])->assertStatus(422)->assertJsonValidationErrors(['mobile_number']);
    }
}
