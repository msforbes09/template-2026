<?php

namespace Tests\Feature\Administrators\Broadcasting;

use App\Enums\PermissionEnum;
use App\Events\Administrators\AdministratorBroadcast;
use App\Models\Access\Permissions\Permission;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Tests for the admin-wide broadcast scaffold: the private `administrators`
 * channel, its Sanctum-guarded auth endpoint, the example event, and the
 * `test:broadcast-admin` command.
 */
class AdministratorBroadcastTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The event broadcasts on the private `administrators` channel with a
     * stable client-facing name and returns its payload.
     */
    public function test_event_shape(): void
    {
        $event = new AdministratorBroadcast(['service_name' => 'WS']);

        $this->assertSame('private-administrators', $event->broadcastOn()->name);
        $this->assertSame('administrator.broadcast', $event->broadcastAs());
        $this->assertSame(['service_name' => 'WS'], $event->broadcastWith());
    }

    /**
     * The command dispatches the admin broadcast with a status payload.
     */
    public function test_command_dispatches_admin_broadcast(): void
    {
        Event::fake();

        $this->artisan('test:broadcast-admin')->assertSuccessful();

        Event::assertDispatched(AdministratorBroadcast::class, fn (AdministratorBroadcast $e) => $e->payload['service_name'] === 'WS'
            && isset($e->payload['name'], $e->payload['environment'], $e->payload['server_time'], $e->payload['timezone'], $e->payload['version']));
    }

    /**
     * The broadcasting-auth endpoint rejects unauthenticated requests.
     */
    public function test_broadcasting_auth_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/administrator/broadcasting/auth', [
            'socket_id' => '123.456',
            'channel_name' => 'private-administrators',
        ]);

        $response->assertUnauthorized();
    }

    /**
     * An authenticated admin can authorize a subscription to the private
     * `administrators` channel and receives a signed auth response.
     */
    public function test_authenticated_admin_can_authorize_private_channel(): void
    {
        // phpunit boots with the `null` broadcaster, so channels.php registered
        // its channels there. Switch to the reverb (Pusher-compatible) driver to
        // get a real signed auth response, then re-load channels.php so the
        // `administrators` channel is registered on that broadcaster.
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
            'broadcasting.connections.reverb.options' => [
                'host' => '127.0.0.1', 'port' => 8080, 'scheme' => 'http', 'useTLS' => false,
            ],
        ]);
        require base_path('routes/channels.php');

        // The channel is permission-gated. See AdministratorChannelAuthTest for who may join.
        Permission::query()->firstOrCreate([
            'name' => PermissionEnum::AUDIT_LOGS_VIEW,
            'guard_name' => Administrator::AUTH_GUARD,
        ]);

        $administrator = Administrator::factory()->create(['with_temporary_password' => false]);
        $administrator->givePermissionTo(PermissionEnum::AUDIT_LOGS_VIEW);

        $token = $administrator->createToken('administrator')->plainTextToken;

        $response = $this->postJson('/api/v1/administrator/broadcasting/auth', [
            'socket_id' => '123.456',
            'channel_name' => 'private-administrators',
        ], ['Authorization' => "Bearer {$token}"]);

        $response->assertOk();
        $response->assertJsonStructure(['auth']);
    }
}
