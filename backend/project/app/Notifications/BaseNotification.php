<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Base class for every in-app notification: database channel only, queued on
 * the default queue (a lightweight row write), encrypted at rest in the jobs
 * table (payloads can carry admin remarks and the user model pointer).
 *
 * Subclasses implement databaseType() — the SHORT dotted string stored in the
 * `type` column (never a class name) — and toDatabase(), whose array MUST
 * always carry a `reference` key (a `{type, …ids}` map for FE deep-linking, or
 * null when the destination follows from the type itself).
 */
abstract class BaseNotification extends Notification implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable;

    /**
     * Deliver via the database channel only; realtime broadcasting piggybacks
     * on the framework's NotificationSent event (see BroadcastStoredNotification).
     *
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * The short dotted type stored in the `type` column.
     */
    abstract public function databaseType(object $notifiable): string;

    /**
     * The stored payload. Must include a `reference` key (map or null).
     *
     * @return array<string, mixed>
     */
    abstract public function toDatabase(object $notifiable): array;
}
