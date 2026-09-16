<?php

namespace Tests\Feature\Administrators;

use App\Events\Administrators\TemporaryPasswordIssued;
use App\Listeners\Administrators\SendTemporaryPasswordEmail;
use App\Mail\Administrators\TemporaryPasswordMail;
use App\Models\Administrators\Administrator;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Feature tests for temporary-password email delivery.
 */
class TemporaryPasswordEmailTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Creating an administrator dispatches the temporary-password event.
     */
    public function test_create_dispatches_temporary_password_event(): void
    {
        Event::fake([TemporaryPasswordIssued::class]);

        $administrator = Administrator::createAndGeneratePassword([
            'email' => 'new@admin.test',
            'first_name' => 'New',
            'last_name' => 'Admin',
            'photo_uuid' => null,
        ]);

        Event::assertDispatched(
            TemporaryPasswordIssued::class,
            fn (TemporaryPasswordIssued $e) => $e->administrator->is($administrator) && $e->temporaryPassword !== '',
        );
    }

    /**
     * Resetting a password dispatches the temporary-password event.
     */
    public function test_reset_dispatches_temporary_password_event(): void
    {
        Event::fake([TemporaryPasswordIssued::class]);

        $administrator = Administrator::factory()->create();
        $administrator->resetPassword();

        Event::assertDispatched(
            TemporaryPasswordIssued::class,
            fn (TemporaryPasswordIssued $e) => $e->administrator->is($administrator),
        );
    }

    /**
     * The mailable renders the temporary password, name, and subject.
     */
    public function test_mailable_renders_password_and_subject(): void
    {
        $administrator = Administrator::factory()->create(['first_name' => 'Ada']);

        $mailable = new TemporaryPasswordMail($administrator, 'Secret123');

        $mailable->assertHasSubject('Your '.config('app.name').' temporary password');
        $mailable->assertSeeInHtml('Secret123');
        $mailable->assertSeeInHtml('Ada');
    }

    /**
     * sendTemporaryPassword() mails the temporary password to the administrator.
     */
    public function test_send_temporary_password_sends_mail(): void
    {
        Mail::fake();

        $administrator = Administrator::factory()->create(['email' => 'ada@admin.test']);

        $administrator->sendTemporaryPassword('Secret123');

        Mail::assertSent(
            TemporaryPasswordMail::class,
            fn (TemporaryPasswordMail $m) => $m->hasTo('ada@admin.test') && $m->temporaryPassword === 'Secret123',
        );
    }

    /**
     * The listener is queued on the `mailer` queue.
     */
    public function test_listener_is_queued_on_mailer_queue(): void
    {
        $listener = new SendTemporaryPasswordEmail;

        $this->assertInstanceOf(ShouldQueue::class, $listener);
        $this->assertSame('mailer', $listener->queue);
    }

    /**
     * Creating an administrator ultimately sends the temporary-password email
     * (event -> queued listener runs synchronously under the sync test queue).
     */
    public function test_create_sends_temporary_password_email_end_to_end(): void
    {
        Mail::fake();

        Administrator::createAndGeneratePassword([
            'email' => 'e2e@admin.test',
            'first_name' => 'E2E',
            'last_name' => 'Admin',
            'photo_uuid' => null,
        ]);

        Mail::assertSent(
            TemporaryPasswordMail::class,
            fn (TemporaryPasswordMail $m) => $m->hasTo('e2e@admin.test'),
        );
    }

    /**
     * The Horizon supervisor works the `mailer` queue in every environment, so the
     * temporary-password mail is actually delivered rather than left queued.
     */
    public function test_horizon_works_the_mailer_queue(): void
    {
        $defaults = config('horizon.defaults.supervisor-1');

        foreach (config('horizon.environments') as $environment => $supervisors) {
            $queues = array_merge($defaults, $supervisors['supervisor-1'])['queue'];

            $this->assertContains('mailer', $queues, "$environment does not work the mailer queue");
        }
    }
}
