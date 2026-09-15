<?php

namespace App\Console\Commands\OpenSearch;

use App\Services\OpenSearch\LogLifecycle;
use Illuminate\Console\Command;

/**
 * Applies the OpenSearch log lifecycle: creates/updates the shared ISM policy, the
 * per-type index templates, and each write-alias bootstrap index. Idempotent — safe
 * to run on every deploy. Run before any indexing so the write aliases exist.
 */
class ApplyLogLifecycleCommand extends Command
{
    /**
     * The console command signature.
     *
     * @var string
     */
    protected $signature = 'opensearch:apply-lifecycle';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create/update the OpenSearch log ISM policy, index templates, and write aliases.';

    /**
     * Execute the console command.
     */
    public function handle(LogLifecycle $lifecycle): int
    {
        foreach ($lifecycle->apply() as $result) {
            $line = "[{$result['status']}] {$result['uri']}".
                (isset($result['message']) ? " — {$result['message']}" : '');

            $result['status'] === 'error' ? $this->warn($line) : $this->line($line);
        }

        return self::SUCCESS;
    }
}
