<?php

namespace Tests\Feature\Sms;

use App\Jobs\SendSms;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Tests the `test:sms` smoke command.
 */
class TestSmsCommandTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A valid number queues a SendSms job and reports success.
     */
    public function test_valid_number_queues_a_sms(): void
    {
        Queue::fake();

        $this->artisan('test:sms', ['number' => '+639171234567'])->assertSuccessful();

        Queue::assertPushed(SendSms::class, fn (SendSms $job) => $job->number === '+639171234567');
    }

    /**
     * An invalid number is rejected and nothing is queued.
     */
    public function test_invalid_number_is_rejected(): void
    {
        Queue::fake();

        $this->artisan('test:sms', ['number' => '09171234567'])->assertFailed();

        Queue::assertNotPushed(SendSms::class);
    }
}
