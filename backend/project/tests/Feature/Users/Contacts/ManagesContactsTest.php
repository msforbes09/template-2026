<?php

namespace Tests\Feature\Users\Contacts;

use App\Enums\AuthChannelEnum;
use App\Exceptions\ContactAlreadySetException;
use App\Exceptions\InvalidOtpException;
use App\Mail\Users\AddContactOtpMail;
use App\Mail\Users\ContactInUseMail;
use App\Models\Users\User;
use App\Services\Security\PiiCrypter;
use App\Services\Sms\SmsSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Fakes\FakeSmsSender;
use Tests\TestCase;

/**
 * Model-level tests for adding + verifying the other contact channel.
 */
class ManagesContactsTest extends TestCase
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
     * A mobile-only user (no email).
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
     * A mobile-only user adds a free email: an OTP is sent to the new address.
     */
    public function test_add_email_issues_otp_to_the_new_address(): void
    {
        Mail::fake();
        $user = $this->mobileUser();

        $result = $user->addContact(AuthChannelEnum::EMAIL, 'new@example.com');

        $this->assertDatabaseHas('otps', ['type' => 'user_contact_email', 'identifier' => 'new@example.com']);
        Mail::assertSent(AddContactOtpMail::class);
        $this->assertNotEmpty($result->pin);
    }

    /**
     * Verifying the OTP sets the email and its verified-at timestamp.
     */
    public function test_verify_email_sets_it_on_the_account(): void
    {
        Mail::fake();
        $user = $this->mobileUser();
        $result = $user->addContact(AuthChannelEnum::EMAIL, 'new@example.com');

        $user->verifyContact(AuthChannelEnum::EMAIL, 'new@example.com', $result->pin);

        $fresh = $user->fresh();
        $this->assertSame('new@example.com', $fresh->email);
        $this->assertNotNull($fresh->email_verified_at);
        $this->assertSame(app(PiiCrypter::class)->hash('new@example.com'), $fresh->getAttributes()['email_hash']);
    }

    /**
     * Adding a contact type the account already has is rejected.
     */
    public function test_add_contact_already_set_is_rejected(): void
    {
        $user = $this->mobileUser(); // already has a mobile

        $this->expectException(ContactAlreadySetException::class);
        $user->addContact(AuthChannelEnum::SMS, '+639998887777');
    }

    /**
     * A contact already used by another account issues the "in use" notice type
     * (not the PIN) with an identical result, and cannot be completed.
     */
    public function test_add_email_taken_by_another_uses_exists_type_and_cannot_complete(): void
    {
        Mail::fake();
        User::create([ // another account already owns this email
            'email' => 'taken@example.com', 'first_name' => 'A', 'last_name' => 'B',
            'password' => 'Secret@123', 'email_verified_at' => now(), 'status' => 'draft', 'is_active' => true,
        ]);
        $user = $this->mobileUser();

        $result = $user->addContact(AuthChannelEnum::EMAIL, 'taken@example.com');

        $this->assertDatabaseHas('otps', ['type' => 'user_contact_exists_email', 'identifier' => 'taken@example.com']);
        Mail::assertSent(ContactInUseMail::class);
        Mail::assertNotSent(AddContactOtpMail::class);

        // Even with the real PIN, the taken email cannot be claimed.
        $this->expectException(InvalidOtpException::class);
        try {
            $user->verifyContact(AuthChannelEnum::EMAIL, 'taken@example.com', $result->pin);
        } finally {
            $this->assertNull($user->fresh()->email);
        }
    }

    /**
     * An email-only user adds a mobile: the OTP is delivered by SMS.
     */
    public function test_add_mobile_delivers_via_sms(): void
    {
        $this->fakeSms();
        $user = User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'company_name' => 'Acme Corp', 'password' => 'Secret@123', 'email_verified_at' => now(),
            'status' => 'draft', 'registration_method' => 'website', 'is_active' => true,
        ]);

        $result = $user->addContact(AuthChannelEnum::SMS, '+639998887777');
        $user->verifyContact(AuthChannelEnum::SMS, '+639998887777', $result->pin);

        $fresh = $user->fresh();
        $this->assertSame('+639998887777', $fresh->mobile_number);
        $this->assertNotNull($fresh->mobile_number_verified_at);
        $this->assertStringContainsString($result->pin, $this->sms->sent[0]['message']);
    }

    /**
     * The add-contact OTP belongs to the requesting user, so the SMS send is
     * attributed to them.
     */
    public function test_add_mobile_sms_is_attributed_to_the_user(): void
    {
        $this->fakeSms();
        $user = User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'company_name' => 'Acme Corp', 'password' => 'Secret@123', 'email_verified_at' => now(),
            'status' => 'draft', 'registration_method' => 'website', 'is_active' => true,
        ]);

        $result = $user->addContact(AuthChannelEnum::SMS, '+639998887777');

        $this->assertTrue($result->otpable?->is($user));
        $this->assertSame(['user_type' => 'User', 'user_id' => $user->getKey()], $this->sms->sent[0]['causer']);
    }
}
