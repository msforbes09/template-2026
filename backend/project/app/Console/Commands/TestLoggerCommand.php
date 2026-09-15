<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Writes a log record to verify the logging pipeline (e.g. the CloudWatch channel).
 */
class TestLoggerCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:logger
        {message? : The message to log}
        {--level=info : Log level: debug|info|notice|warning|error|critical|alert|emergency}
        {--channel= : Target a specific log channel (default: the app default/stack)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Write a test log record to verify the logging pipeline';

    /**
     * The PSR-3 levels a caller may choose.
     *
     * @var list<string>
     */
    private const LEVELS = ['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $level = strtolower((string) $this->option('level'));

        if (! in_array($level, self::LEVELS, true)) {
            $this->error("Invalid level '{$level}'. Use one of: ".implode(', ', self::LEVELS).'.');

            return self::FAILURE;
        }

        $message = (string) ($this->argument('message') ?? 'Logger smoke test — '.config('app.name'));
        $channel = $this->option('channel');

        $logger = $channel ? Log::channel($channel) : Log::getFacadeRoot();

        $logger->log($level, $message, [
            'command' => 'test:logger',
            'env' => $this->laravel->environment(),
            'at' => now()->format('Y-m-d H:i:s'),
        ]);

        $this->info("Logged [{$level}] via '".($channel ?: config('logging.default'))."': {$message}");

        return self::SUCCESS;
    }
}
