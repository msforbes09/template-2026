<?php

namespace Tests\Feature\Users\Contacts;

use App\Mail\Users\AddContactOtpMail;
use App\Models\Users\User;
use App\Services\Sms\SmsSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\Fakes\FakeSmsSender;
use Tests\TestCase;

/**
 * HTTP tests for the authenticated add-contact / verify-contact endpoints.
 */
class AddContactEndpointTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A mobile-only draft user.
     */
    private function mobileUser(): User
    {
        return User::create([
            'mobile_number' => '+639171234567', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'company_name' => 'Acme Corp', 'password' => 'Secret@123', 'mobile_number_verified_at' => now(),
            'status' => 'draft', 'registration_method' => 'website', 'is_active' => true,
        ]);
    }

    /**
     * A mobile-only user adds an email end-to-end (draft user, ungated).
     */
    public function test_mobile_user_adds_an_email(): void
    {
        Mail::fake();
        $user = $this->mobileUser();
        Sanctum::actingAs($user, ['*'], 'users');

        $this->postJson('/api/v1/user/profile/add-contact', ['channel' => 'email', 'email' => 'new@example.com'])
            ->assertOk()->assertJsonStructure(['resend_token', 'retry_after']);

        $pin = null;
        Mail::assertSent(AddContactOtpMail::class, function (AddContactOtpMail $mail) use (&$pin) {
            $pin = $mail->pin;

            return true;
        });

        $this->postJson('/api/v1/user/profile/verify-contact', ['channel' => 'email', 'email' => 'new@example.com', 'otp' => $pin])
            ->assertOk()->assertJsonPath('data.email', 'new@example.com');

        $this->assertSame('new@example.com', $user->fresh()->email);
    }

    /**
     * An email-only user adds a mobile end-to-end (OTP delivered by SMS).
     */
    public function test_email_user_adds_a_mobile(): void
    {
        $sms = new FakeSmsSender;
        $this->app->instance(SmsSender::class, $sms);
        $user = User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'company_name' => 'Acme Corp', 'password' => 'Secret@123', 'email_verified_at' => now(),
            'status' => 'draft', 'registration_method' => 'website', 'is_active' => true,
        ]);
        Sanctum::actingAs($user, ['*'], 'users');

        $this->postJson('/api/v1/user/profile/add-contact', ['channel' => 'sms', 'mobile_number' => '+639998887777'])
            ->assertOk();

        $pin = $sms->pin();

        $this->postJson('/api/v1/user/profile/verify-contact', ['channel' => 'sms', 'mobile_number' => '+639998887777', 'otp' => $pin])
            ->assertOk()->assertJsonPath('data.mobile_number', '+639998887777');
    }

    /**
     * Adding a contact type the account already has is rejected.
     */
    public function test_add_contact_already_set_is_rejected(): void
    {
        $user = $this->mobileUser();
        Sanctum::actingAs($user, ['*'], 'users');

        $this->postJson('/api/v1/user/profile/add-contact', ['channel' => 'sms', 'mobile_number' => '+639998887777'])
            ->assertStatus(400)->assertJson(['error' => 'contact_already_set']);
    }

    /**
     * The endpoints require authentication.
     */
    public function test_requires_authentication(): void
    {
        $this->postJson('/api/v1/user/profile/add-contact', ['channel' => 'email', 'email' => 'new@example.com'])
            ->assertUnauthorized();
    }

    /**
     * add-contact requires the identifier matching the channel.
     */
    public function test_validation_requires_identifier(): void
    {
        Sanctum::actingAs($this->mobileUser(), ['*'], 'users');

        $this->postJson('/api/v1/user/profile/add-contact', ['channel' => 'email'])
            ->assertStatus(422)->assertJsonValidationErrors(['email']);
    }
}
