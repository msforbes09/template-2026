<?php

namespace Tests\Feature\Broadcasting;

use App\Events\TestBroadcast;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Smoke tests for the Reverb broadcast setup (the `test:broadcast` command).
 */
class ReverbBroadcastTest extends TestCase
{
    /**
     * The command broadcasts a service-status payload.
     */
    public function test_command_broadcasts_status_payload(): void
    {
        Event::fake();

        $this->artisan('test:broadcast')->assertSuccessful();

        Event::assertDispatched(TestBroadcast::class, fn (TestBroadcast $e) => $e->payload['service_name'] === 'WS'
            && isset($e->payload['name'], $e->payload['environment'], $e->payload['server_time'], $e->payload['timezone'], $e->payload['version']));
    }

    /**
     * The event broadcasts on the public `test` channel and returns its payload.
     */
    public function test_event_shape(): void
    {
        $event = new TestBroadcast(['service_name' => 'WS']);

        $this->assertSame('test', $event->broadcastOn()->name);
        $this->assertSame('test.broadcast', $event->broadcastAs());
        $this->assertSame(['service_name' => 'WS'], $event->broadcastWith());
    }
}
