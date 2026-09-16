<?php

namespace Tests\Feature\Administrators\Administrators;

use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests for showing a single administrator.
 */
class AdministratorShowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(
            Administrator::factory()->create([
                'first_name' => 'Zzz',
                'email' => 'actor@auth.test',
                'is_active' => true,
                'with_temporary_password' => false,
            ]),
            ['administrators-view', 'administrators-manage'],
            'administrators',
        );
    }

    /**
     * An existing administrator is returned.
     */
    public function test_it_shows_an_administrator(): void
    {
        $administrator = Administrator::factory()->create();

        $response = $this->getJson("/api/v1/administrator/administrators/{$administrator->id}");

        $response->assertOk();
        $response->assertJsonPath('data.id', $administrator->id);
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/',
            $response->json('data.created_at'),
        );
    }

    /**
     * The show endpoint returns the full, unmasked email (unlike the list).
     */
    public function test_show_returns_full_email(): void
    {
        $administrator = Administrator::factory()->create(['email' => 'alice@example.com']);

        $this->getJson("/api/v1/administrator/administrators/{$administrator->id}")
            ->assertOk()
            ->assertJsonPath('data.email', 'alice@example.com');
    }

    /**
     * The administrator's assigned roles are included in the response.
     */
    public function test_it_includes_assigned_roles(): void
    {
        $administrator = Administrator::factory()->create();
        $role = Role::factory()->create();
        $administrator->syncRoles([$role->id]);

        $response = $this->getJson("/api/v1/administrator/administrators/{$administrator->id}");

        $response->assertOk();
        $response->assertJsonCount(1, 'data.roles');
        $response->assertJsonPath('data.roles.0.id', $role->id);
    }

    /**
     * A missing administrator renders the data_not_found envelope.
     */
    public function test_it_returns_data_not_found_for_missing_administrator(): void
    {
        $response = $this->getJson('/api/v1/administrator/administrators/999999');

        $response->assertStatus(404);
        $response->assertJson(['error' => 'data_not_found']);
    }
}
