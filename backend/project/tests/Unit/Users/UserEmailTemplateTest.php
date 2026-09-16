<?php

namespace Tests\Unit\Users;

use App\Mail\Users\PasswordResetNoAccountMail;
use App\Mail\Users\PasswordResetOtpMail;
use App\Mail\Users\User2faOtpMail;
use App\Mail\Users\UserAccountExistsMail;
use App\Mail\Users\UserRegistrationOtpMail;
use Tests\TestCase;

/**
 * The branded user email templates render the configurable logo header (or the
 * app name when no logo is configured) and the PIN where one applies.
 */
class UserEmailTemplateTest extends TestCase
{
    /**
     * The no-account password-reset notice offers registration.
     */
    public function test_password_reset_no_account_offers_registration(): void
    {
        $mail = new PasswordResetNoAccountMail('user@example.com');

        $mail->assertSeeInHtml('create an account');
    }

    /**
     * With a logo URL configured, every user email carries it in the header.
     */
    public function test_all_user_emails_carry_the_configured_logo(): void
    {
        config(['mail.logo_url' => 'https://cdn.example.com/logo.png']);

        foreach ([new UserRegistrationOtpMail('1'), new UserAccountExistsMail('1')] as $mail) {
            $mail->assertSeeInHtml('https://cdn.example.com/logo.png', false);
        }
    }

    /**
     * Without a logo URL, the header falls back to the app name as text.
     */
    public function test_emails_fall_back_to_the_app_name_without_a_logo(): void
    {
        config(['mail.logo_url' => null, 'app.name' => 'Acme Platform']);

        $mail = new UserRegistrationOtpMail('1');

        $mail->assertDontSeeInHtml('<img', false);
        $mail->assertSeeInHtml('Acme Platform');
    }

    /**
     * OTP emails show the PIN.
     */
    public function test_otp_emails_show_the_pin(): void
    {
        foreach ([UserRegistrationOtpMail::class, User2faOtpMail::class, PasswordResetOtpMail::class] as $class) {
            (new $class('482913'))->assertSeeInHtml('482913');
        }
    }
}
