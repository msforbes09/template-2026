<?php

namespace Tests\Feature\Notifications;

use App\Mail\Administrators\Admin2faOtpMail;
use App\Mail\Administrators\TemporaryPasswordMail;
use App\Models\Administrators\Administrator;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Every outbound notification names the platform it comes from, sourced from
 * `config('app.name')` — an SMS or subject line carries no other context, so
 * every message must name the service that sent it.
 */
class NotificationBrandingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A user reachable only by SMS, so the lifecycle listeners take the text path.
     */
    private function smsOnlyUser(): User
    {
        return User::factory()->create(['email' => null, 'mobile_number' => '+639171234567']);
    }

    /**
     * Every configured OTP SMS template names the platform.
     */
    public function test_every_otp_sms_template_names_the_platform(): void
    {
        $brand = (string) config('app.name');
        $templates = config('otp.sms');

        $this->assertNotEmpty($templates);

        foreach ($templates as $type => $template) {
            $this->assertStringContainsString($brand, $template, "OTP SMS template [{$type}] does not name the platform.");
        }
    }

    /**
     * The admin mail subjects that spell the platform out use the configured name.
     */
    public function test_admin_mail_subjects_name_the_platform(): void
    {
        $brand = (string) config('app.name');

        $administrator = Administrator::factory()->create();

        $this->assertStringContainsString($brand, (new Admin2faOtpMail('123456'))->envelope()->subject);
        $this->assertStringContainsString($brand, (new TemporaryPasswordMail($administrator, 'secret'))->envelope()->subject);
    }
}
