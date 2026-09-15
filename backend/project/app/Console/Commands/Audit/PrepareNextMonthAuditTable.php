<?php

namespace App\Console\Commands\Audit;

use App\Models\Misc\Audits\Audit;
use Illuminate\Console\Command;

/**
 * Pre-creates next month's audit table so month-boundary writes never hit the create path.
 */
class PrepareNextMonthAuditTable extends Command
{
    /**
     * The console command signature.
     *
     * @var string
     */
    protected $signature = 'audit:prepare-next-table';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = "Create next month's audit table ahead of time";

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $created = (new Audit)->createMonthlyTableIfNotExists(now()->addMonth());

        $this->info($created ? 'Next month audit table created.' : 'Next month audit table already exists.');

        return self::SUCCESS;
    }
}
