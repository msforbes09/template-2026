<?php

namespace App\Logging;

use Aws\CloudWatchLogs\CloudWatchLogsClient;
use Monolog\Formatter\JsonFormatter;
use Monolog\Handler\WhatFailureGroupHandler;
use Monolog\Logger;
use PhpNexus\Cwh\Handler\CloudWatch;

/**
 * Builds a Monolog logger that ships records to AWS CloudWatch Logs, used by the
 * `cloudwatch` custom log channel (config/logging.php).
 *
 * Hardened over a plain phpnexus/cwh wiring:
 *  - credentials are passed to the SDK only when a key is set, so ECS/EC2 IAM
 *    roles resolve through the default provider chain (empty keys would block it);
 *  - the CloudWatch handler is wrapped in a WhatFailureGroupHandler, so a
 *    CloudWatch/AWS outage drops the log instead of breaking the request;
 *  - a JsonFormatter (with stack traces) makes records queryable in Logs Insights.
 */
class CloudWatchLoggerFactory
{
    /**
     * Create a CloudWatch-backed Monolog logger from the channel config.
     *
     * @param  array<string, mixed>  $config
     */
    public function __invoke(array $config): Logger
    {
        $client = new CloudWatchLogsClient($this->clientConfig($config));

        $handler = new CloudWatch(
            $client,
            $config['group_name'],
            (string) $config['stream_name'],
            (int) ($config['retention'] ?? 14),
            (int) ($config['batch_size'] ?? 10000),
            [],
            $config['level'] ?? 'debug',
        );

        $handler->setFormatter($this->formatter());

        $logger = new Logger($config['name'] ?? (string) config('app.name', 'app'));
        // The wrapper swallows a failing CloudWatch flush so logging never breaks
        // the caller (mirrors the connection-log / OTP "never break the caller" rule).
        $logger->pushHandler(new WhatFailureGroupHandler([$handler]));

        return $logger;
    }

    /**
     * AWS client config. Explicit credentials are included only when a key is
     * provided; otherwise the SDK's default provider chain (env / IAM role) wins.
     *
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    private function clientConfig(array $config): array
    {
        $aws = [
            'region' => $config['region'],
            'version' => $config['version'] ?? 'latest',
        ];

        if (! empty($config['credentials']['key'])) {
            $aws['credentials'] = $config['credentials'];
        }

        return $aws;
    }

    /**
     * A JSON formatter (with stack traces) for CloudWatch Logs Insights.
     */
    private function formatter(): JsonFormatter
    {
        return (new JsonFormatter)->includeStacktraces();
    }
}
