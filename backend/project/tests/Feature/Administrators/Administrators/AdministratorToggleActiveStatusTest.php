<?php

namespace Tests\Feature\Administrators\Administrators;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests for toggling an administrator's active status.
 */
class AdministratorToggleActiveStatusTest extends TestCase
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
     * Toggling flips is_active from true to false and back.
     */
    public function test_it_toggles_active_status(): void
    {
        $administrator = Administrator::factory()->create(['is_active' => true]);

        $first = $this->postJson("/api/v1/administrator/administrators/{$administrator->id}/toggle-active-status");
        $first->assertOk();
        $first->assertJsonPath('data.is_active', 0);
        $this->assertFalse($administrator->fresh()->is_active);

        $second = $this->postJson("/api/v1/administrator/administrators/{$administrator->id}/toggle-active-status");
        $second->assertJsonPath('data.is_active', 1);
        $this->assertTrue($administrator->fresh()->is_active);
    }
}
