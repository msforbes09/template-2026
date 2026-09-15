<?php

namespace Tests\Feature\Sms;

use App\Jobs\SendSms;
use App\Services\Sms\LogSmsSender;
use App\Services\Sms\SmsSender;
use Illuminate\Support\Facades\Log;
use Mockery\MockInterface;
use Tests\TestCase;

/**
 * The SendSms job hands every text to the bound SmsSender, and the template's
 * default binding is the log-only sender.
 */
class SendSmsJobTest extends TestCase
{
    /**
     * The job is pinned to the dedicated `sms` queue.
     */
    public function test_job_is_queued_on_sms_queue(): void
    {
        $job = new SendSms('+639170000000', 'hello');

        $this->assertSame('sms', $job->queue);
    }

    /**
     * The job forwards number, message, and causer to the bound sender.
     */
    public function test_job_forwards_to_the_bound_sender(): void
    {
        $this->mock(SmsSender::class, function (MockInterface $mock) {
            $mock->shouldReceive('send')
                ->once()
                ->with('+639170000000', 'hello', ['user_type' => 'User', 'user_id' => 7]);
        });

        (new SendSms('+639170000000', 'hello', 'User', 7))->handle(app(SmsSender::class));
    }

    /**
     * The default binding is the log sender, so dev works without a provider.
     */
    public function test_default_binding_is_log_sender(): void
    {
        $this->assertInstanceOf(LogSmsSender::class, app(SmsSender::class));
    }

    /**
     * The log sender masks the number and blanks any PIN-looking digit run.
     */
    public function test_log_sender_redacts_number_and_pin(): void
    {
        Log::shouldReceive('info')->once()->withArgs(function (string $message, array $context) {
            return $message === 'SMS (log driver)'
                && ! str_contains($context['number'], '0000000')
                && $context['message'] === 'Your code is ******.';
        });

        (new LogSmsSender)->send('+639170000000', 'Your code is 123456.');
    }
}
