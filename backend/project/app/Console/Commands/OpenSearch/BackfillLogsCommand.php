<?php

namespace App\Console\Commands\OpenSearch;

use App\Models\Misc\Audits\Audit;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Misc\Connections\Connection;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Schema;
use OpenSearch\Client;

/**
 * Backfills existing MySQL log rows into OpenSearch — bulk-indexes each monthly
 * table's rows into the model's write alias, keyed by the composite scout id
 * ("{Y_m}:{id}"). Idempotent (re-indexing overwrites the same doc id). Run
 * `opensearch:apply-lifecycle` first so the aliases exist.
 */
class BackfillLogsCommand extends Command
{
    /**
     * The console command signature.
     *
     * @var string
     */
    protected $signature = 'opensearch:backfill-logs {--model= : One resource key (gateway_logs|connections|auth_attempts|audits); all if omitted} {--months=3 : How many months back to scan, including the current (matches the default retention)} {--chunk=500 : Rows per bulk request}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Bulk-index existing MySQL log rows into their OpenSearch alias.';

    /**
     * The searchable log models, keyed by resource key.
     *
     * @var array<string, class-string>
     */
    private const MODELS = [
        'connections' => Connection::class,
        'auth_attempts' => AuthAttempt::class,
        'audits' => Audit::class,
    ];

    /**
     * Execute the console command.
     */
    public function handle(Client $client): int
    {
        $only = $this->option('model');
        $months = max((int) $this->option('months'), 1);
        $chunk = max((int) $this->option('chunk'), 1);

        $models = $only ? array_intersect_key(self::MODELS, [$only => true]) : self::MODELS;

        if ($only && ! $models) {
            $this->error("Unknown model '{$only}'. One of: ".implode(', ', array_keys(self::MODELS)));

            return self::FAILURE;
        }

        foreach ($models as $model) {
            $this->backfillModel($client, $model, $months, $chunk);
        }

        return self::SUCCESS;
    }

    /**
     * Backfill one model across its recent monthly tables.
     *
     * @param  class-string  $model
     */
    private function backfillModel(Client $client, string $model, int $months, int $chunk): void
    {
        $instance = new $model;
        $connection = $instance->getConnectionName();
        $total = 0;

        for ($i = $months - 1; $i >= 0; $i--) {
            $table = $instance->getTableForMonth(now()->subMonthsNoOverflow($i));

            if (! Schema::connection($connection)->hasTable($table)) {
                continue;
            }

            $model::query()->from($table)->orderBy('id')->chunkById($chunk, function (Collection $rows) use ($client, &$total) {
                $body = [];

                foreach ($rows as $row) {
                    $body[] = ['index' => ['_index' => $row->searchableAs(), '_id' => $row->getScoutKey()]];
                    $body[] = $row->toSearchableArray();
                }

                if ($body) {
                    $client->bulk(['body' => $body]);
                }

                $total += $rows->count();
            });
        }

        $this->info("{$instance->searchableAs()}: indexed {$total} row(s).");
    }
}
