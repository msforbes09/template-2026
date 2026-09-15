<?php

namespace App\Console\Commands;

use App\Models\Notifications\Notification;
use Illuminate\Console\Command;

/**
 * Deletes in-app notifications older than the retention window — MySQL row and
 * OpenSearch document alike, via chunked MODEL deletes so Scout observes each
 * removal (never a bulk query delete). The window is clamped to at least one
 * month at the config layer AND here, so a set-but-empty env can never become
 * a delete-everything sweep. Scheduled daily (`routes/console.php`).
 */
class PruneNotificationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:prune';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete in-app notifications older than the retention window (both stores)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $months = max(1, (int) config('notifications.retention_months', 12));
        $cutoff = now()->subMonths($months);
        $pruned = 0;

        Notification::query()
            ->where('created_at', '<', $cutoff)
            ->chunkById(500, function ($chunk) use (&$pruned): void {
                $chunk->each(function (Notification $notification) use (&$pruned): void {
                    $notification->delete();
                    $pruned++;
                });
            });

        $this->info("Pruned {$pruned} notification(s) older than {$months} month(s).");

        return self::SUCCESS;
    }
}
