<?php

namespace Tests\Feature\Security;

use App\Models\Administrators\Administrator;
use App\Models\Misc\Audits\Audit;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * An administrator reading user PII must leave an audit trail: who read what,
 * when, and from where. The model-event audit system never fires on reads, so a
 * dedicated middleware records the access.
 */
class PiiAccessAuditTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Authenticate an admin holding the given abilities and return them.
     *
     * @param  list<string>  $abilities
     */
    private function actingWith(array $abilities): Administrator
    {
        $admin = Administrator::factory()->create(['with_temporary_password' => false]);
        Sanctum::actingAs($admin, $abilities, 'administrators');

        return $admin;
    }

    /**
     * A user record.
     */
    private function user(): User
    {
        return User::create([
            'email' => 'user@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
            'email_verified_at' => now(), 'is_active' => true,
        ]);
    }

    /**
     * Viewing a single user writes a pii-access audit naming reader and target.
     */
    public function test_showing_a_user_is_audited(): void
    {
        $admin = $this->actingWith(['users-view']);
        $user = $this->user();

        $this->getJson("/api/v1/administrator/users/{$user->uuid}")->assertOk();

        $this->assertDatabaseHas((new Audit)->getTable(), [
            'event' => 'accessed',
            'tags' => 'pii-access',
            'user_type' => 'Administrator',
            'user_id' => $admin->id,
            'auditable_type' => 'User',
            'auditable_id' => $user->id,
        ]);
    }

    /**
     * Listing users is NOT audited — the list masks contact PII, so it is not a
     * full-disclosure surface, and auditing every paginated call is needless load.
     */
    public function test_listing_users_is_not_audited(): void
    {
        $this->actingWith(['users-view']);
        $this->user();
        (new Audit)->createMonthlyTableIfNotExists(); // monthly tables are on-demand

        $this->getJson('/api/v1/administrator/users')->assertOk();

        $this->assertDatabaseMissing((new Audit)->getTable(), ['tags' => 'pii-access']);
    }

    /**
     * Viewing a single administrator is audited the same way (the show endpoint
     * discloses the full record).
     */
    public function test_showing_an_administrator_is_audited(): void
    {
        $admin = $this->actingWith(['administrators-view']);
        $target = Administrator::factory()->create();

        $this->getJson("/api/v1/administrator/administrators/{$target->id}")->assertOk();

        $this->assertDatabaseHas((new Audit)->getTable(), [
            'event' => 'accessed',
            'tags' => 'pii-access',
            'user_type' => 'Administrator',
            'user_id' => $admin->id,
            'auditable_type' => 'Administrator',
            'auditable_id' => $target->id,
        ]);
    }

    /**
     * Listing administrators is NOT audited (masked list, same rationale).
     */
    public function test_listing_administrators_is_not_audited(): void
    {
        $this->actingWith(['administrators-view']);
        (new Audit)->createMonthlyTableIfNotExists();

        $this->getJson('/api/v1/administrator/administrators')->assertOk();

        $this->assertDatabaseMissing((new Audit)->getTable(), ['tags' => 'pii-access']);
    }

    /**
     * A forbidden read (missing ability) writes no audit — nothing was disclosed.
     */
    public function test_forbidden_read_is_not_audited(): void
    {
        $this->actingWith(['roles-view']); // lacks users-view
        $user = $this->user();
        (new Audit)->createMonthlyTableIfNotExists(); // monthly tables are on-demand

        $this->getJson("/api/v1/administrator/users/{$user->uuid}")->assertStatus(403);

        $this->assertDatabaseMissing((new Audit)->getTable(), ['tags' => 'pii-access']);
    }
}
