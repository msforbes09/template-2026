<?php

namespace Tests\Feature\Administrators\Administrators;

use App\Mail\Administrators\TemporaryPasswordMail;
use App\Models\Administrators\Administrator;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests for creating administrators.
 */
class AdministratorStoreTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The administrator acting in these tests.
     */
    private Administrator $actor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actor = Administrator::factory()->create([
            'first_name' => 'Zzz',
            'email' => 'actor@auth.test',
            'is_active' => true,
            'with_temporary_password' => false,
        ]);

        Sanctum::actingAs($this->actor, ['administrators-view', 'administrators-manage'], 'administrators');
    }

    /**
     * A private file owned by the acting administrator (a valid `photo_uuid`).
     */
    private function ownedPhotoUuid(): string
    {
        return File::factory()->create([
            'owner_type' => $this->actor->getMorphClass(),
            'owner_id' => $this->actor->getKey(),
        ])->uuid;
    }

    /**
     * A valid payload creates an administrator with an auto-generated temporary password.
     */
    public function test_it_creates_an_administrator_with_a_temporary_password(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/administrator/administrators', [
            'email' => 'admin@example.com',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'photo_uuid' => $this->ownedPhotoUuid(),
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.email', 'admin@example.com');
        $response->assertJsonPath('data.is_active', 1);
        $response->assertJsonMissingPath('data.password');

        $administrator = Administrator::firstWhere('email', 'admin@example.com');
        $this->assertNotNull($administrator);
        $this->assertTrue($administrator->with_temporary_password);
        $this->assertNotEmpty($administrator->password);
        $this->assertFalse(Hash::check('', $administrator->password));
    }

    /**
     * The auto-generated temporary password contains only alphanumeric characters.
     */
    public function test_the_generated_temporary_password_is_alphanumeric(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/administrator/administrators', [
            'email' => 'admin@example.com',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'photo_uuid' => $this->ownedPhotoUuid(),
        ])->assertCreated();

        Mail::assertSent(
            TemporaryPasswordMail::class,
            fn (TemporaryPasswordMail $mail) => preg_match('/^[A-Za-z0-9]+$/', $mail->temporaryPassword) === 1,
        );
    }

    /**
     * Email is required and must be unique among non-trashed administrators.
     */
    public function test_it_rejects_duplicate_email(): void
    {
        Administrator::factory()->create(['email' => 'taken@example.com']);

        $response = $this->postJson('/api/v1/administrator/administrators', [
            'email' => 'taken@example.com',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'photo_uuid' => $this->ownedPhotoUuid(),
        ]);

        $response->assertStatus(422);
    }

    /**
     * A photo_uuid is required when creating an administrator.
     */
    public function test_it_requires_photo_uuid(): void
    {
        $response = $this->postJson('/api/v1/administrator/administrators', [
            'email' => 'admin@example.com',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('photo_uuid');
    }

    /**
     * A disposable-email domain is rejected.
     */
    public function test_it_rejects_a_disposable_email(): void
    {
        Cache::forever('disposable_domains', ['mailinator.com']);

        $this->postJson('/api/v1/administrator/administrators', [
            'email' => 'admin@mailinator.com',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'photo_uuid' => $this->ownedPhotoUuid(),
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    /**
     * A plus-addressed email is rejected.
     */
    public function test_it_rejects_a_plus_addressed_email(): void
    {
        $this->postJson('/api/v1/administrator/administrators', [
            'email' => 'admin+001@example.com',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'photo_uuid' => $this->ownedPhotoUuid(),
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    /**
     * is_active is not accepted on create; it defaults to active and is
     * controlled by the dedicated toggle endpoint.
     */
    public function test_it_ignores_is_active_in_the_payload(): void
    {
        $response = $this->postJson('/api/v1/administrator/administrators', [
            'email' => 'admin@example.com',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'photo_uuid' => $this->ownedPhotoUuid(),
            'is_active' => false,
        ]);

        $response->assertCreated();
        $this->assertTrue(Administrator::firstWhere('email', 'admin@example.com')->is_active);
    }
}
