<?php

namespace App\Events\Notifications;

use App\Models\Notifications\Notification;
use App\Services\Notifications\NotificationCopy;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Realtime push of a freshly stored in-app notification on the user's own
 * private `user.{uuid}` channel (event name `notification.created`), so the
 * FE's bell updates without polling. Our own event — NOT Laravel's broadcast
 * notification channel, which would put an FQCN on the wire and force a second
 * Echo convention on the FE.
 */
class NotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    /**
     * Create the event.
     */
    public function __construct(
        public readonly Notification $notification,
        public readonly string $userUuid,
    ) {}

    /**
     * The user's own private channel.
     */
    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('user.'.$this->userUuid);
    }

    /**
     * The event name the FE listens for.
     */
    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    /**
     * The payload — the stored row's resource shape.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $copy = NotificationCopy::render($this->notification->type, $this->notification->data);

        return [
            'id' => $this->notification->id,
            'type' => $this->notification->type,
            'title' => $copy['title'],
            'message' => $copy['message'],
            'data' => $this->notification->data,
            'read_at' => null,
            'created_at' => $this->notification->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}
