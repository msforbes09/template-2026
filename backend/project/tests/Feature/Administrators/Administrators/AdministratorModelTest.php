<?php

namespace Tests\Feature\Administrators\Administrators;

use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Tests for the Administrator model's casts, hidden attributes, and soft deletes.
 */
class AdministratorModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Passwords are hashed and sensitive fields are hidden from array output.
     */
    public function test_it_hashes_password_and_hides_sensitive_fields(): void
    {
        $administrator = Administrator::factory()->create([
            'password' => 'plain-text-secret',
            'auth_token' => 'a-token',
        ]);

        $this->assertNotSame('plain-text-secret', $administrator->password);
        $this->assertTrue(Hash::check('plain-text-secret', $administrator->password));
        $this->assertArrayNotHasKey('password', $administrator->toArray());
        $this->assertArrayNotHasKey('auth_token', $administrator->toArray());
    }

    /**
     * Administrators soft delete rather than being removed.
     */
    public function test_it_soft_deletes(): void
    {
        $administrator = Administrator::factory()->create();

        $administrator->delete();

        $this->assertSoftDeleted($administrator);
        $this->assertCount(0, Administrator::all());
    }
}
