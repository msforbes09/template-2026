<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * A WebSocket smoke-test broadcast — pushes an arbitrary payload to the public
 * `test` channel to verify the Reverb pipeline end-to-end.
 */
class TestBroadcast implements ShouldBroadcastNow
{
    use Dispatchable;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(public array $payload) {}

    /**
     * The channel to broadcast on (public — no auth for the smoke test).
     */
    public function broadcastOn(): Channel
    {
        return new Channel('test');
    }

    /**
     * The client-facing event name.
     */
    public function broadcastAs(): string
    {
        return 'test.broadcast';
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
