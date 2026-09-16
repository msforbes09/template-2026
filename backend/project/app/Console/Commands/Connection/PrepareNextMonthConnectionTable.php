<?php

namespace App\Console\Commands\Connection;

use App\Models\Misc\Connections\Connection;
use Illuminate\Console\Command;

/**
 * Pre-creates next month's connection table so month-boundary writes never hit
 * the create path.
 */
class PrepareNextMonthConnectionTable extends Command
{
    /**
     * The console command signature.
     *
     * @var string
     */
    protected $signature = 'connection:prepare-next-table';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = "Create next month's connection table ahead of time";

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $created = (new Connection)->createMonthlyTableIfNotExists(now()->addMonth());

        $this->info($created ? 'Next month connection table created.' : 'Next month connection table already exists.');

        return self::SUCCESS;
    }
}
