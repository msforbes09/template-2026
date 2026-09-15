<?php

namespace Tests\Feature\Security;

use App\Exceptions\PiiDecryptException;
use App\Models\Users\User;
use App\Services\Security\PiiCrypter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A failed PII decrypt (wrong/rotated key, corrupt ciphertext) must never let a
 * subsequent write rebuild the blob from an empty base — that would erase every
 * other encrypted field irrecoverably while the blind indexes still point at the
 * lost values. Reads degrade to null (logged); writes fail closed. (F3)
 */
class PiiDecryptFailClosedTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Rebind PiiCrypter so it re-reads the (changed) key.
     */
    private function rekey(string $key): void
    {
        config(['app.pii_key' => $key]);
        $this->app->forgetInstance(PiiCrypter::class);
    }

    /**
     * With the wrong key loaded, writing a PII field throws instead of silently
     * overwriting the ciphertext — and the original blob is left intact, so
     * restoring the correct key recovers every field.
     */
    public function test_write_over_an_undecryptable_blob_is_refused_and_preserves_it(): void
    {
        $keyA = 'base64:'.base64_encode(random_bytes(32));
        $keyB = 'base64:'.base64_encode(random_bytes(32));

        $this->rekey($keyA);
        $user = User::factory()->create(['first_name' => 'Alex', 'last_name' => 'Rivera']);
        $originalCiphertext = $user->fresh()->getAttributes()['ciphertext'];

        // Bring the model up under the WRONG key — decryption now fails.
        $this->rekey($keyB);
        $user = User::query()->find($user->getKey());

        // A read degrades to null rather than crashing.
        $this->assertNull($user->first_name);

        // A write must be refused, not silently rebuild the blob from empty.
        try {
            $user->last_name = 'Overwritten';
            $user->save();
            $this->fail('Expected PiiDecryptException.');
        } catch (PiiDecryptException) {
            // expected
        }

        // The stored blob is untouched, so the correct key recovers everything.
        $this->assertSame($originalCiphertext, $user->fresh()->getAttributes()['ciphertext']);

        $this->rekey($keyA);
        $recovered = User::query()->find($user->getKey());
        $this->assertSame('Alex', $recovered->first_name);
        $this->assertSame('Rivera', $recovered->last_name);
    }
}
