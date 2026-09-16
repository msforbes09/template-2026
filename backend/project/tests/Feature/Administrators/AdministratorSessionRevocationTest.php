<?php

namespace Tests\Feature\Administrators;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Feature tests asserting active sessions are revoked on reset / deactivation.
 */
class AdministratorSessionRevocationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Resetting the password revokes all of the administrator's tokens.
     */
    public function test_reset_password_revokes_tokens(): void
    {
        Mail::fake();

        $administrator = Administrator::factory()->create();
        $administrator->createToken('administrators');
        $this->assertSame(1, $administrator->tokens()->count());

        $administrator->resetPassword();

        $this->assertSame(0, $administrator->tokens()->count());
    }

    /**
     * Deactivating an administrator revokes all of their tokens.
     */
    public function test_deactivation_revokes_tokens(): void
    {
        $administrator = Administrator::factory()->create(['is_active' => true]);
        $administrator->createToken('administrators');

        $administrator->toggleActiveStatus();

        $this->assertFalse($administrator->fresh()->is_active);
        $this->assertSame(0, $administrator->tokens()->count());
    }

    /**
     * Re-activating an administrator does not touch tokens.
     */
    public function test_reactivation_does_not_revoke_tokens(): void
    {
        $administrator = Administrator::factory()->create(['is_active' => false]);
        $administrator->createToken('administrators');

        $administrator->toggleActiveStatus();

        $this->assertTrue($administrator->fresh()->is_active);
        $this->assertSame(1, $administrator->tokens()->count());
    }
}
