<?php

namespace Tests\Feature\Users\Registration;

use App\Enums\AuthEventEnum;
use App\Mail\Users\UserRegistrationOtpMail;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Users\User;
use App\Services\Security\PiiCrypter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Registration attempts are written to the auth trail (user identifier hashed).
 */
class RegistrationLoggingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Starting a registration records a REGISTRATION_STARTED attempt, with the
     * email stored hashed only (never in plaintext) and no resolved account yet.
     */
    public function test_start_registration_is_logged_with_a_hashed_and_masked_identifier(): void
    {
        Mail::fake();

        User::startRegistration(['email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera', 'company_name' => 'Acme Corp']);

        $attempt = AuthAttempt::query()->where('event', AuthEventEnum::REGISTRATION_STARTED->value)->first();

        $this->assertNotNull($attempt);
        $this->assertSame(User::AUTH_GUARD, $attempt->guard);
        $this->assertSame('u•••@example.com', $attempt->identifier); // user identifier stored masked, never raw
        $this->assertSame(app(PiiCrypter::class)->hash('user@example.com'), $attempt->identifier_hash);
        $this->assertNull($attempt->user_id);
    }

    /**
     * Completing a registration records a REGISTRATION_COMPLETED attempt bound to
     * the newly created user.
     */
    public function test_complete_registration_is_logged_against_the_new_user(): void
    {
        Mail::fake();
        User::startRegistration(['email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera', 'company_name' => 'Acme Corp']);

        $pin = null;
        Mail::assertSent(UserRegistrationOtpMail::class, function ($mail) use (&$pin) {
            $pin = $mail->pin;

            return true;
        });

        User::completeRegistration('user@example.com', $pin, 'Secret@123');

        $user = User::first();
        $attempt = AuthAttempt::query()->where('event', AuthEventEnum::REGISTRATION_COMPLETED->value)->first();

        $this->assertNotNull($attempt);
        $this->assertSame((int) $user->id, (int) $attempt->user_id);
        $this->assertSame('User', $attempt->user_type);
    }
}
