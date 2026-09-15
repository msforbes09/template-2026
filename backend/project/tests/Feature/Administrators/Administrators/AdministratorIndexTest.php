<?php

namespace Tests\Feature\Administrators\Administrators;

use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests for listing administrators.
 */
class AdministratorIndexTest extends TestCase
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
     * Every list row carries its roles. The resource guards them with
     * whenLoaded(), so without the eager load the field silently vanished and
     * the UI was left backfilling roles with one audited show request per row.
     */
    public function test_each_row_includes_its_roles(): void
    {
        $role = Role::create(['name' => 'Assessor', 'guard_name' => Administrator::AUTH_GUARD]);
        $admin = Administrator::factory()->create();
        $admin->assignRole($role);

        $response = $this->getJson('/api/v1/administrator/administrators')->assertOk();

        $rows = collect($response->json('data'));
        $withRole = $rows->firstWhere('id', $admin->id);
        $withoutRole = $rows->first(fn (array $row) => $row['id'] !== $admin->id);

        $this->assertSame(['Assessor'], array_column($withRole['roles'], 'name'));
        // Present as an EMPTY LIST on a role-less admin — an absent key and an
        // empty set must not be conflated by the consumer.
        $this->assertSame([], $withoutRole['roles']);
    }

    /**
     * `?role=` narrows the list to administrators holding that role (by id) —
     * the target the roles screen's admins-count link lands on.
     */
    public function test_it_filters_by_role(): void
    {
        $role = Role::create(['name' => 'Assessor', 'guard_name' => Administrator::AUTH_GUARD]);
        $holder = Administrator::factory()->create();
        $holder->assignRole($role);
        Administrator::factory()->create();

        $response = $this->getJson('/api/v1/administrator/administrators?role='.$role->id)->assertOk();

        $this->assertSame([$holder->id], array_column($response->json('data'), 'id'));
    }

    /**
     * The index returns a paginated list excluding soft-deleted administrators.
     */
    public function test_it_lists_administrators_and_excludes_trashed(): void
    {
        Administrator::factory()->count(3)->create();
        Administrator::factory()->create()->delete();

        $response = $this->getJson('/api/v1/administrator/administrators');

        $response->assertOk();
        $response->assertJsonCount(4, 'data'); // +1 authenticated actor
        $response->assertJsonStructure([
            'data' => [['id', 'email', 'first_name', 'last_name', 'is_active']],
            'links',
            'meta',
        ]);
        $response->assertJsonMissingPath('data.0.password');
        $response->assertJsonMissingPath('data.0.auth_token');
    }

    /**
     * The list masks email but keeps names — browsing it can't harvest everyone's
     * address, while an admin can still identify a colleague.
     */
    public function test_list_masks_email_but_keeps_names(): void
    {
        Administrator::factory()->create(['first_name' => 'Alice', 'last_name' => 'Reyes', 'email' => 'alice@example.com']);

        $this->getJson('/api/v1/administrator/administrators?search=alice')
            ->assertOk()
            ->assertJsonPath('data.0.first_name', 'Alice')
            ->assertJsonPath('data.0.last_name', 'Reyes')
            ->assertJsonPath('data.0.email', 'a•••@example.com');
    }

    /**
     * The index filters results by the search term across name and email.
     */
    public function test_it_searches_by_name_or_email(): void
    {
        Administrator::factory()->create(['first_name' => 'Alice', 'email' => 'alice@example.com']);
        Administrator::factory()->create(['first_name' => 'Bob', 'email' => 'bob@example.com']);

        $response = $this->getJson('/api/v1/administrator/administrators?search=alice');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.first_name', 'Alice');
    }

    /**
     * The index filters by an exact-match column (is_active).
     */
    public function test_it_filters_by_is_active(): void
    {
        Administrator::factory()->count(2)->create(['is_active' => true]);
        Administrator::factory()->create(['is_active' => false]);

        $response = $this->getJson('/api/v1/administrator/administrators?is_active=0');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.is_active', 0);
    }

    /**
     * The index applies a column filter and search together (multiple filters at once).
     */
    public function test_it_combines_column_filter_and_search(): void
    {
        Administrator::factory()->create(['first_name' => 'Alice', 'is_active' => true]);
        Administrator::factory()->create(['first_name' => 'Alice', 'is_active' => false]);
        Administrator::factory()->create(['first_name' => 'Bob', 'is_active' => true]);

        $response = $this->getJson('/api/v1/administrator/administrators?search=Alice&is_active=1');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.first_name', 'Alice');
        $response->assertJsonPath('data.0.is_active', 1);
    }

    /**
     * The index does not filter on non-whitelisted columns.
     */
    public function test_it_ignores_non_filterable_columns(): void
    {
        Administrator::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/administrator/administrators?first_name=whatever&password=x');

        $response->assertOk();
        $response->assertJsonCount(4, 'data'); // +1 authenticated actor
    }

    /**
     * The index orders results by a whitelisted column and direction.
     */
    public function test_it_orders_by_a_whitelisted_column(): void
    {
        Administrator::factory()->create(['first_name' => 'Bravo']);
        Administrator::factory()->create(['first_name' => 'Alpha']);

        $response = $this->getJson('/api/v1/administrator/administrators?order_by=first_name&sort_by=asc');

        $response->assertOk();
        $response->assertJsonPath('data.0.first_name', 'Alpha');
        $response->assertJsonPath('data.1.first_name', 'Bravo');
    }

    /**
     * The index respects the per_page page size.
     */
    public function test_it_respects_per_page(): void
    {
        Administrator::factory()->count(5)->create();

        $response = $this->getJson('/api/v1/administrator/administrators?per_page=2');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
        $response->assertJsonPath('meta.per_page', 2);
    }
}
