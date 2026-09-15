<?php

namespace Tests\Feature\Users\Registration;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Validation rules for the registration endpoints.
 */
class RegistrationValidationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Missing names, company, and a bad email are rejected as validation errors.
     */
    public function test_register_rejects_missing_fields(): void
    {
        $this->postJson('/api/v1/user/register', ['email' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'first_name', 'last_name', 'company_name']);
    }

    /**
     * Plus-addressed emails are rejected.
     */
    public function test_register_rejects_plus_addressing(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/user/register', [
            'email' => 'user+tag@example.com', 'first_name' => 'Alex', 'last_name' => 'Rivera',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    /**
     * A weak password is rejected at verify.
     */
    public function test_verify_rejects_weak_password(): void
    {
        $this->postJson('/api/v1/user/verify-registration', [
            'email' => 'user@example.com', 'otp' => '123456', 'password' => 'weak', 'password_confirmation' => 'weak',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);
    }
}
