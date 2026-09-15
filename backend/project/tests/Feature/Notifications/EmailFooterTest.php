<?php

namespace Tests\Feature\Notifications;

use App\Mail\Users\UserRegistrationOtpMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The shared mail footer gives the recipient a way to reach a human. Every
 * branded email renders through the same `mail-body` component, so asserting on
 * one mailable covers all of them.
 */
class EmailFooterTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The footer offers the support address as a clickable mailto link.
     */
    public function test_footer_links_the_support_address(): void
    {
        $support = (string) config('mail.support_address');
        $html = (new UserRegistrationOtpMail('123456'))->render();

        $this->assertStringContainsString('mailto:'.$support, $html);
        $this->assertStringContainsString($support, $html);
    }

    /**
     * The mailto pre-fills a subject naming the platform, so a support mailbox
     * shared across services can tell where the enquiry came from. It is built
     * from `config('app.name')` like the rest of the copy, never a literal.
     */
    public function test_support_mailto_pre_fills_a_branded_subject(): void
    {
        $html = (new UserRegistrationOtpMail('123456'))->render();

        $this->assertStringContainsString('subject='.rawurlencode(config('app.name').' - Support'), $html);
    }

    /**
     * The support link's href closes with a single quote before the next
     * attribute. A doubled quote (`href="mailto:…"" target=…`) parses as a stray
     * attribute and is the kind of typo an email client renders badly.
     */
    public function test_support_link_href_is_well_formed(): void
    {
        $html = (new UserRegistrationOtpMail('123456'))->render();

        $this->assertMatchesRegularExpression('/href="mailto:[^"]+"\s+target=/', $html);
    }

    /**
     * The support address is never the no-reply from address — the footer invites
     * a reply, so pointing it at an unmonitored mailbox would strand the sender.
     */
    public function test_support_address_is_not_the_no_reply_address(): void
    {
        $this->assertNotSame(
            (string) config('mail.from.address'),
            (string) config('mail.support_address'),
        );
    }

    /**
     * The footer still names the platform and the current year.
     */
    public function test_footer_carries_the_brand_and_year(): void
    {
        $html = (new UserRegistrationOtpMail('123456'))->render();

        $this->assertStringContainsString((string) config('app.name'), $html);
        $this->assertStringContainsString(date('Y'), $html);
    }
}
