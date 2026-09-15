<?php

namespace Tests\Feature\Administrators\TwoFactor;

use App\Mail\Administrators\Admin2faOtpMail;
use App\Services\Otp\OtpMailer;
use App\Services\Otp\OtpResult;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Tests OtpMailer delivery and the 2FA Mailable rendering.
 */
class OtpMailerTest extends TestCase
{
    /**
     * send() sends the mapped Mailable to the identifier (async comes from the listener).
     */
    public function test_it_sends_the_mapped_mailable(): void
    {
        Mail::fake();

        app(OtpMailer::class)->send(new OtpResult('123456', 'tok', 'admin_2fa', 'ada@admin.test', null));

        Mail::assertSent(
            Admin2faOtpMail::class,
            fn (Admin2faOtpMail $m) => $m->hasTo('ada@admin.test') && $m->pin === '123456',
        );
    }

    /**
     * The Mailable renders the PIN and subject.
     */
    public function test_mailable_renders_pin(): void
    {
        $mailable = new Admin2faOtpMail('123456');

        $mailable->assertHasSubject('Your '.config('app.name').' verification code');
        $mailable->assertSeeInHtml('123456');
    }
}
