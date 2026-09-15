<?php

namespace Tests\Feature\Logging;

use App\Logging\CloudWatchLoggerFactory;
use Monolog\Handler\WhatFailureGroupHandler;
use Monolog\Logger;
use Tests\TestCase;

/**
 * The CloudWatch logger factory builds a resilient Monolog logger without making
 * any AWS network calls at construction time.
 */
class CloudWatchLoggerFactoryTest extends TestCase
{
    /**
     * A representative channel config.
     *
     * @return array<string, mixed>
     */
    private function config(array $overrides = []): array
    {
        return array_merge([
            'region' => 'ap-southeast-1',
            'version' => 'latest',
            'credentials' => ['key' => 'AKIA...', 'secret' => 'secret'],
            'group_name' => '/uploads/test',
            'stream_name' => 'testing',
            'retention' => 14,
            'batch_size' => 100,
            'level' => 'debug',
            'name' => 'uploads',
        ], $overrides);
    }

    /**
     * It returns a Monolog logger whose sole handler is the failure-tolerant
     * wrapper (so a CloudWatch outage never breaks the caller).
     */
    public function test_builds_a_resilient_monolog_logger(): void
    {
        $logger = (new CloudWatchLoggerFactory)($this->config());

        $this->assertInstanceOf(Logger::class, $logger);
        $this->assertSame('uploads', $logger->getName());
        $this->assertInstanceOf(WhatFailureGroupHandler::class, $logger->getHandlers()[0]);
    }

    /**
     * With no explicit key, it still builds (credentials resolve via the SDK's
     * default provider chain — e.g. an IAM role).
     */
    public function test_builds_without_explicit_credentials(): void
    {
        $logger = (new CloudWatchLoggerFactory)($this->config([
            'credentials' => ['key' => '', 'secret' => ''],
        ]));

        $this->assertInstanceOf(Logger::class, $logger);
    }
}
