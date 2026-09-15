<?php

namespace Tests\Feature\Logging;

use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * Tests the `test:logger` smoke command.
 */
class TestLoggerCommandTest extends TestCase
{
    /**
     * It logs the message at the requested level and reports success.
     */
    public function test_logs_at_the_requested_level(): void
    {
        Log::spy();

        $this->artisan('test:logger', ['message' => 'hello logs', '--level' => 'warning'])
            ->assertSuccessful();

        Log::shouldHaveReceived('log')->once()->withArgs(
            fn ($level, $message) => $level === 'warning' && $message === 'hello logs',
        );
    }

    /**
     * It defaults to the info level when none is given.
     */
    public function test_defaults_to_info(): void
    {
        Log::spy();

        $this->artisan('test:logger')->assertSuccessful();

        Log::shouldHaveReceived('log')->once()->withArgs(fn ($level) => $level === 'info');
    }

    /**
     * An unknown level is rejected without logging.
     */
    public function test_rejects_an_invalid_level(): void
    {
        Log::spy();

        $this->artisan('test:logger', ['--level' => 'bogus'])->assertFailed();

        Log::shouldNotHaveReceived('log');
    }
}
