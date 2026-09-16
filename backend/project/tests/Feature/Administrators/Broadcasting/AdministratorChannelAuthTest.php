<?php

namespace Tests\Feature\Administrators\Broadcasting;

use App\Enums\PermissionEnum;
use App\Models\Access\Permissions\Permission;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Tests\TestCase;

/**
 * Who may subscribe to the private `administrators` channel.
 *
 * The channel once authorised with a bare `return true`, so every authenticated
 * admin — including one still sitting on a temporary password, holding no
 * permissions at all — received the live feed. It is now gated on the
 * log-viewing permissions, since the feed carries log-derived events.
 */
class AdministratorChannelAuthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Create the permission rows the channel gate consults. (Seeding the full
     * AccessSeeder is not an option here — it requires SUPER_ADMIN_PASSWORD.)
     */
    protected function setUp(): void
    {
        parent::setUp();

        foreach ([PermissionEnum::AUDIT_LOGS_VIEW, PermissionEnum::AUTH_LOGS_VIEW] as $permission) {
            Permission::query()->firstOrCreate([
                'name' => $permission,
                'guard_name' => Administrator::AUTH_GUARD,
            ]);
        }
    }

    /**
     * Run the channel's authorisation callback for the given admin.
     */
    private function mayJoin(Administrator $administrator): bool
    {
        $channel = collect(Broadcast::getChannels())->keys()->first(
            fn (string $name): bool => $name === 'administrators',
        );

        $this->assertNotNull($channel, 'The administrators channel must be registered.');

        return (bool) Broadcast::getChannels()['administrators']($administrator);
    }

    /**
     * An admin holding a log-viewing permission may join the feed.
     */
    public function test_an_admin_with_a_log_permission_may_join(): void
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        $admin->givePermissionTo(PermissionEnum::AUDIT_LOGS_VIEW);

        $this->assertTrue($this->mayJoin($admin->fresh()));
    }

    /**
     * Any of the log-viewing permissions is enough.
     */
    public function test_an_admin_with_another_log_permission_may_join(): void
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        $admin->givePermissionTo(PermissionEnum::AUTH_LOGS_VIEW);

        $this->assertTrue($this->mayJoin($admin->fresh()));
    }

    /**
     * An admin with neither permission is refused, however well authenticated.
     */
    public function test_an_admin_with_neither_permission_is_refused(): void
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);

        $this->assertFalse($this->mayJoin($admin));
    }

    /**
     * An admin who has not finished setting up their account is refused even with the
     * right permission — a temporary password means they are not really them yet.
     */
    public function test_an_admin_on_a_temporary_password_is_refused(): void
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => true]);
        $admin->givePermissionTo(PermissionEnum::AUDIT_LOGS_VIEW);

        $this->assertFalse($this->mayJoin($admin->fresh()));
    }
}
