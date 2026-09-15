<?php

namespace Tests\Feature\Administrators\Users;

use App\Models\Administrators\Administrator;
use App\Models\Users\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests admin list + show of users.
 */
class AdminUserTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Authenticate an administrator with the given abilities.
     *
     * @param  list<string>  $abilities
     */
    private function actingWith(array $abilities): void
    {
        Sanctum::actingAs(
            Administrator::factory()->create(['with_temporary_password' => false]),
            $abilities,
            'administrators',
        );
    }

    public function test_lists_users(): void
    {
        $this->actingWith(['users-view']);
        User::factory()->count(2)->create();

        $this->getJson('/api/v1/administrator/users')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissingPath('data.0.id')
            ->assertJsonMissingPath('data.0.password')
            ->assertJsonMissingPath('data.0.address')
            ->assertJsonMissingPath('data.0.citizenship');
    }

    /**
     * T3b — an array filter value (e.g. ?is_active[]=0) is IGNORED rather than
     * cast to a surprising truthy int that inverts the filter. Both active and
     * inactive users are returned (the malformed filter is simply not applied).
     */
    public function test_array_filter_value_is_ignored_not_inverted(): void
    {
        $this->actingWith(['users-view']);
        $active = User::factory()->create(['is_active' => true]);
        $inactive = User::factory()->create(['is_active' => false]);

        $response = $this->getJson('/api/v1/administrator/users?is_active[]=0')->assertOk();
        $uuids = collect($response->json('data'))->pluck('uuid');

        $this->assertTrue($uuids->contains($active->uuid));
        $this->assertTrue($uuids->contains($inactive->uuid));
    }

    /**
     * The list masks contact PII and omits birth_date/gender, but keeps names —
     * so browsing the list can't harvest everyone's full contact details, while
     * admins can still identify and search for people.
     */
    public function test_list_masks_contact_and_omits_dob_gender(): void
    {
        $this->actingWith(['users-view']);
        User::factory()->create([
            'first_name' => 'Alex', 'last_name' => 'Rivera',
            'email' => 'user@example.com', 'mobile_number' => '+639090000123',
            'birth_date' => '1990-01-01', 'gender' => 'male',
        ]);

        $this->getJson('/api/v1/administrator/users')
            ->assertOk()
            ->assertJsonPath('data.0.first_name', 'Alex')
            ->assertJsonPath('data.0.last_name', 'Rivera')
            ->assertJsonPath('data.0.email', 'u•••@example.com')
            ->assertJsonPath('data.0.mobile_number', '+6390•••••123')
            ->assertJsonMissingPath('data.0.birth_date')
            ->assertJsonMissingPath('data.0.gender');
    }

    /**
     * The show endpoint returns full, unmasked contact PII (the admin needs it for
     * the one record — and this access is audited).
     */
    public function test_show_returns_full_contact(): void
    {
        $this->actingWith(['users-view']);
        $user = User::factory()->create([
            'email' => 'user@example.com', 'mobile_number' => '+639090000123', 'gender' => 'male',
        ]);

        $this->getJson("/api/v1/administrator/users/{$user->uuid}")
            ->assertOk()
            ->assertJsonPath('data.email', 'user@example.com')
            ->assertJsonPath('data.mobile_number', '+639090000123')
            ->assertJsonPath('data.gender', 'male');
    }

    /**
     * Show binds by uuid (not id).
     */
    public function test_shows_user_by_uuid(): void
    {
        $this->actingWith(['users-view']);
        $user = User::factory()->create(['company_name' => 'Acme Corp', 'authentication_channel' => 'sms']);

        $this->getJson("/api/v1/administrator/users/{$user->uuid}")
            ->assertOk()
            ->assertJsonPath('data.uuid', $user->uuid)
            ->assertJsonPath('data.company_name', 'Acme Corp')
            ->assertJsonPath('data.authentication_channel', 'sms')
            ->assertJsonMissingPath('data.id');

        // The internal id must not resolve the route.
        $this->getJson("/api/v1/administrator/users/{$user->id}")->assertNotFound();
    }

    /**
     * Reading users requires the users-view ability.
     */
    public function test_requires_users_view(): void
    {
        $this->actingWith([]);
        User::factory()->create();

        $this->getJson('/api/v1/administrator/users')->assertStatus(403);
    }
}
