<?php

namespace App\Console\Commands\Email;

use App\Services\Connections\DisposableEmailService;
use Illuminate\Console\Command;

/**
 * Fetches and caches the disposable-email domain blocklist (run on a schedule).
 */
class CacheDisposableDomains extends Command
{
    /**
     * The console command signature.
     *
     * @var string
     */
    protected $signature = 'email:cache-disposable-domains';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch and cache the disposable-email domain blocklist';

    /**
     * Execute the console command.
     */
    public function handle(DisposableEmailService $service): int
    {
        $service->cacheDomains();

        $this->info('Disposable-email domains cached.');

        return self::SUCCESS;
    }
}
