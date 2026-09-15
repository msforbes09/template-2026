<?php

namespace Tests\Unit\Users;

use App\Mail\Users\UserRegistrationOtpMail;
use Tests\TestCase;

/**
 * The registration OTP mailable renders the PIN.
 */
class RegistrationMailablesTest extends TestCase
{
    /**
     * The OTP mail renders the PIN into the message body.
     */
    public function test_otp_mail_renders_pin(): void
    {
        (new UserRegistrationOtpMail('123456'))->assertSeeInHtml('123456');
    }
}
