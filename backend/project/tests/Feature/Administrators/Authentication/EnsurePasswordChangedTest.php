<?php

namespace Tests\Feature\Administrators\Authentication;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests the temporary-password restriction middleware.
 */
class EnsurePasswordChangedTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Define a protected route guarded by the middleware for the test.
     */
    protected function defineProtectedRoute(): void
    {
        Route::middleware(['auth:administrators', 'password.changed'])
            ->get('/__protected', fn () => response()->json(['ok' => true]));
    }

    /**
     * An admin with a temporary password is blocked with 403.
     */
    public function test_temporary_password_admin_is_blocked(): void
    {
        $this->defineProtectedRoute();
        $administrator = Administrator::factory()->create(['with_temporary_password' => true]);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->getJson('/__protected')->assertStatus(403);
    }

    /**
     * An admin without a temporary password is allowed through.
     */
    public function test_admin_without_temporary_password_passes(): void
    {
        $this->defineProtectedRoute();
        $administrator = Administrator::factory()->create(['with_temporary_password' => false]);
        Sanctum::actingAs($administrator, guard: 'administrators');

        $this->getJson('/__protected')->assertOk();
    }
}
