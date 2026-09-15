<?php

namespace Tests\Feature\Sms;

use App\Events\Otp\OtpIssued;
use App\Jobs\SendSms;
use App\Listeners\Otp\SendOtp;
use App\Mail\Users\UserRegistrationOtpMail;
use App\Models\Users\User;
use App\Services\Otp\OtpResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * SendOtp routes delivery by channel: SMS types text, email types mail.
 */
class SendOtpChannelRoutingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * An SMS OTP type dispatches a SendSms carrying the PIN — and sends no mail.
     */
    public function test_sms_type_dispatches_a_text(): void
    {
        Queue::fake();
        Mail::fake();

        $result = new OtpResult('123456', 'resend', 'user_registration_sms', '+639171234567', null, 60);
        (new SendOtp)->handle(new OtpIssued($result));

        Queue::assertPushed(SendSms::class, function (SendSms $job) {
            return $job->number === '+639171234567' && str_contains($job->message, '123456');
        });
        Mail::assertNothingSent();
    }

    /**
     * When the OTP belongs to a known user (2FA, add-contact, password reset), the
     * text job carries that user so the connection log is attributed to them.
     */
    public function test_sms_for_a_known_user_carries_the_causer(): void
    {
        Queue::fake();
        $user = User::factory()->create();

        $result = new OtpResult('123456', 'resend', 'user_2fa_sms', '+639171234567', $user, 60);
        (new SendOtp)->handle(new OtpIssued($result));

        Queue::assertPushed(SendSms::class, fn (SendSms $job) => $job->userType === 'User' && $job->userId === $user->getKey());
    }

    /**
     * An email OTP type still mails and dispatches no text.
     */
    public function test_email_type_still_mails(): void
    {
        Queue::fake();
        Mail::fake();

        $result = new OtpResult('123456', 'resend', 'user_registration_email', 'user@example.com', null, 60);
        (new SendOtp)->handle(new OtpIssued($result));

        Mail::assertSent(UserRegistrationOtpMail::class);
        Queue::assertNotPushed(SendSms::class);
    }
}
