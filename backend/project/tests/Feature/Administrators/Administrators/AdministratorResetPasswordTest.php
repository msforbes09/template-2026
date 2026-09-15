<?php

namespace Tests\Feature\Administrators\Administrators;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests for resetting an administrator's password.
 */
class AdministratorResetPasswordTest extends TestCase
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
     * Resetting issues a new temporary password and flags the account accordingly.
     */
    public function test_it_resets_the_password_to_a_new_temporary_one(): void
    {
        Mail::fake();

        $administrator = Administrator::factory()->create([
            'password' => 'original-password',
            'with_temporary_password' => false,
        ]);
        $originalHash = $administrator->password;

        $response = $this->postJson("/api/v1/administrator/administrators/{$administrator->id}/reset-password");

        $response->assertOk();
        $response->assertJsonPath('data.with_temporary_password', 1);
        $response->assertJsonMissingPath('data.password');

        $fresh = $administrator->fresh();
        $this->assertNotSame($originalHash, $fresh->password);
        $this->assertTrue($fresh->with_temporary_password);
    }
}
