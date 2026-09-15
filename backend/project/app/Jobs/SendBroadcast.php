<?php

namespace App\Jobs;

use App\Enums\BroadcastStatusEnum;
use App\Models\Broadcasts\Broadcast;
use App\Notifications\Users\AnnouncementNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Notification;

/**
 * Fans an admin broadcast out to its recipients. Runs on the default queue and
 * writes the notification rows DIRECTLY (`Notification::sendNow` per chunk) —
 * an all-users blast must never enqueue one job per user. Each stored row
 * still fires the per-user `notification.created` realtime push via the
 * NotificationSent bridge. Stamps the resolved recipient count and completion
 * time back onto the history row when done.
 */
class SendBroadcast implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(public Broadcast $broadcast) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $announcement = new AnnouncementNotification($this->broadcast->title, $this->broadcast->body);
        $count = 0;

        $this->broadcast->recipients()->chunkById(200, function ($chunk) use ($announcement, &$count): void {
            Notification::sendNow($chunk, $announcement);
            $count += $chunk->count();
        });

        $this->broadcast->update([
            'status' => BroadcastStatusEnum::SENT->value,
            'recipients_count' => $count,
            'completed_at' => now(),
        ]);
    }
}
