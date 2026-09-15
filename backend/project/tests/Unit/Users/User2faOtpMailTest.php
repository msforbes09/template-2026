<?php

namespace Tests\Unit\Users;

use App\Mail\Users\User2faOtpMail;
use Tests\TestCase;

/**
 * The user 2FA OTP mailable renders its PIN and is wired into OTP config.
 */
class User2faOtpMailTest extends TestCase
{
    /**
     * It renders the PIN and is the configured mailable for the user_2fa type.
     */
    public function test_it_renders_pin_and_is_configured(): void
    {
        (new User2faOtpMail('123456'))->assertSeeInHtml('123456');
        $this->assertSame(User2faOtpMail::class, config('otp.mailables.user_2fa_email'));
    }
}
