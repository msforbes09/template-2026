<?php

namespace Tests\Feature\Administrators\Administrators;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests for deleting administrators.
 */
class AdministratorDeleteTest extends TestCase
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
     * Deleting soft-deletes the administrator and returns the resource.
     */
    public function test_it_soft_deletes_an_administrator(): void
    {
        $administrator = Administrator::factory()->create();

        $response = $this->deleteJson("/api/v1/administrator/administrators/{$administrator->id}");

        $response->assertOk();
        $response->assertJsonPath('data.id', $administrator->id);
        $this->assertSoftDeleted($administrator);

        $this->getJson("/api/v1/administrator/administrators/{$administrator->id}")->assertStatus(404);
    }
}
