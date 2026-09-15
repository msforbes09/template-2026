<?php

namespace Tests\Feature\Administrators\Logs;

use App\Models\Administrators\Administrator;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Users\User;
use App\Services\Security\PiiCrypter;
use App\Services\Security\PiiMasker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The auth-attempt identifier is stored masked (display) plus encrypted at rest
 * (the ciphertext blob) — the API only ever returns the masked form; investigators
 * decrypt the blob directly (tinker/DB) when needed.
 */
class AuthAttemptCiphertextTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Authenticate an admin with the given abilities.
     *
     * @param  list<string>  $abilities
     */
    private function actingWith(array $abilities): void
    {
        Sanctum::actingAs(
            Administrator::factory()->create(['with_temporary_password' => false]),
            $abilities,
            'administrators',
        );
    }

    /**
     * A recorded attempt stores the ciphertext alongside the masked identifier; the
     * plaintext appears nowhere in the row.
     */
    public function test_recorder_stores_ciphertext(): void
    {
        $user = User::factory()->create(['email' => 'kristel@user.test']);
        $user->authenticate();

        $attempt = AuthAttempt::query()->latest('id')->firstOrFail();

        $this->assertSame(PiiMasker::maskIdentifier('kristel@user.test'), $attempt->identifier);
        $this->assertNotNull($attempt->ciphertext);
        $this->assertStringNotContainsString('kristel', json_encode($attempt->getAttributes()));
        $this->assertSame('kristel@user.test', $attempt->revealIdentifier());
    }

    /**
     * The blob is an encrypted JSON map — extendable with more fields later; an
     * unknown field reveals null.
     */
    public function test_ciphertext_is_an_extendable_encrypted_map(): void
    {
        $crypter = app(PiiCrypter::class);
        $log = AuthAttempt::create([
            'guard' => 'users', 'event' => 'invalid_credentials',
            'identifier' => 'a•••@user.test', 'identifier_hash' => 'h',
            'ciphertext' => $crypter->encrypt(['identifier' => 'alex@user.test', 'future_field' => 'x']),
            'ip_address' => '203.0.113.7', 'attempted_at' => now(),
        ]);

        $this->assertSame('alex@user.test', $log->revealIdentifier());
        $this->assertSame('x', $log->revealPii('future_field'));
        $this->assertNull($log->revealPii('missing'));
    }

    /**
     * The show returns the MASKED identifier — never the plaintext (investigations
     * decrypt the ciphertext directly at the database/tinker level). The old
     * dedicated reveal endpoint stays gone.
     */
    public function test_show_returns_the_masked_identifier(): void
    {
        $crypter = app(PiiCrypter::class);
        $log = AuthAttempt::create([
            'guard' => 'users', 'event' => 'invalid_credentials',
            'identifier' => 'k•••@user.test', 'identifier_hash' => $crypter->hash('kristel@user.test'),
            'ciphertext' => $crypter->encrypt(['identifier' => 'kristel@user.test']),
            'ip_address' => '203.0.113.7', 'attempted_at' => now(),
        ]);

        $this->actingWith(['auth-logs-view']);

        $response = $this->getJson("/api/v1/administrator/auth-attempt-logs/{$log->id}")
            ->assertOk()
            ->assertJsonPath('data.identifier', 'k•••@user.test');

        $this->assertStringNotContainsString('kristel@user.test', $response->getContent());

        // The dedicated reveal endpoint stays removed.
        $this->getJson("/api/v1/administrator/auth-attempt-logs/{$log->id}/identifier")->assertStatus(404);
    }
}
