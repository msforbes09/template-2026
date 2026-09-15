<?php

namespace App\Listeners\Notifications;

use App\Events\Notifications\NotificationCreated;
use App\Models\Notifications\Notification;
use App\Models\Users\User;
use Illuminate\Notifications\Events\NotificationSent;

/**
 * Bridges the framework's NotificationSent event (database channel) onto the
 * user's realtime channel: once the row is stored, broadcast
 * `notification.created` on `user.{uuid}`. Non-User recipients (future admin
 * notifications) are skipped until an admin channel decision is made.
 */
class BroadcastStoredNotification
{
    /**
     * Handle the event.
     */
    public function handle(NotificationSent $event): void
    {
        if ($event->channel !== 'database'
            || ! $event->response instanceof Notification
            || ! $event->notifiable instanceof User) {
            return;
        }

        NotificationCreated::dispatch($event->response, $event->notifiable->uuid);
    }
}
