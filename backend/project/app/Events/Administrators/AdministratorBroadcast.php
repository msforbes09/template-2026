<?php

namespace App\Events\Administrators;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * A broadcast delivered to every authenticated administrator over the private
 * `administrators` channel. Scaffold event — the payload and trigger are
 * illustrative and will be replaced by real domain events later.
 */
class AdministratorBroadcast implements ShouldBroadcastNow
{
    use Dispatchable;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(public array $payload) {}

    /**
     * The private channel every authenticated administrator subscribes to.
     */
    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('administrators');
    }

    /**
     * The client-facing event name.
     */
    public function broadcastAs(): string
    {
        return 'administrator.broadcast';
    }

    /**
     * The payload delivered to subscribers.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
