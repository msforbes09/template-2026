<?php

namespace Tests\Feature\Administrators\Administrators;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests for updating administrators.
 */
class AdministratorUpdateTest extends TestCase
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
     * A partial update changes the mutable fields. The email is not among them — it is
     * refused outright; see AdministratorEmailTakeoverTest.
     */
    public function test_it_updates_an_administrator(): void
    {
        $administrator = Administrator::factory()->create([
            'email' => 'keep@example.com',
            'first_name' => 'Old',
        ]);

        $response = $this->putJson("/api/v1/administrator/administrators/{$administrator->id}", [
            'first_name' => 'New',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.first_name', 'New');
        $this->assertSame('New', $administrator->fresh()->first_name);
        $this->assertSame('keep@example.com', $administrator->fresh()->email);
    }

    /**
     * is_active is not accepted on update; it is controlled by the dedicated
     * toggle endpoint.
     */
    public function test_it_ignores_is_active_in_the_payload(): void
    {
        $administrator = Administrator::factory()->create(['is_active' => true]);

        $response = $this->putJson("/api/v1/administrator/administrators/{$administrator->id}", [
            'is_active' => false,
        ]);

        $response->assertOk();
        $this->assertTrue($administrator->fresh()->is_active);
    }
}
