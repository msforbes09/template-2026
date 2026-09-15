<?php

namespace Tests\Feature\Console;

use App\Mail\TestMailerMail;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Feature tests for the `test:mailer` console command.
 */
class TestMailerCommandTest extends TestCase
{
    /**
     * The command queues a test email onto the `mailer` queue.
     */
    public function test_it_queues_a_test_email_on_the_mailer_queue(): void
    {
        Mail::fake();

        $this->artisan('test:mailer', ['email' => 'test@example.com'])
            ->assertSuccessful();

        Mail::assertQueued(
            TestMailerMail::class,
            fn (TestMailerMail $m) => $m->hasTo('test@example.com') && $m->queue === 'mailer',
        );
    }

    /**
     * An invalid email address fails the command and queues nothing.
     */
    public function test_it_rejects_an_invalid_email(): void
    {
        Mail::fake();

        $this->artisan('test:mailer', ['email' => 'not-an-email'])
            ->assertFailed();

        Mail::assertNothingQueued();
    }
}
