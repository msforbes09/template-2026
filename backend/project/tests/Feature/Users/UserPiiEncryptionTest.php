<?php

namespace Tests\Feature\Users;

use App\Models\Users\User;
use App\Services\Security\PiiCrypter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Tests PII-at-rest encryption on the User model: transparent round-trip,
 * encrypted storage (no plaintext columns), and keyed-HMAC blind-index lookup.
 */
class UserPiiEncryptionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * PII set on the model round-trips transparently after a reload.
     */
    public function test_pii_round_trips_through_the_model(): void
    {
        $user = User::factory()->create([
            'first_name' => 'Alex',
            'last_name' => 'Rivera',
            'email' => 'user@example.com',
            'mobile_number' => '+639170000000',
            'birth_date' => '1990-01-01',
            'address_line_one' => '123 Rizal St',
        ]);

        $fresh = User::find($user->id);

        $this->assertSame('Alex', $fresh->first_name);
        $this->assertSame('Rivera', $fresh->last_name);
        $this->assertSame('user@example.com', $fresh->email);
        $this->assertSame('+639170000000', $fresh->mobile_number);
        $this->assertSame('1990-01-01', $fresh->birth_date);
        $this->assertSame('123 Rizal St', $fresh->address_line_one);
    }

    /**
     * PII is encrypted at rest — no plaintext columns, no plaintext in ciphertext.
     */
    public function test_pii_is_encrypted_at_rest(): void
    {
        User::factory()->create(['first_name' => 'SecretName', 'email' => 'secret@example.com']);

        $row = DB::table('users')->first();

        $this->assertObjectNotHasProperty('first_name', $row);
        $this->assertObjectNotHasProperty('email', $row);
        $this->assertNotEmpty($row->ciphertext);
        $this->assertStringNotContainsString('SecretName', $row->ciphertext);
    }

    /**
     * A keyed-HMAC blind index enables exact-match lookup on an encrypted field.
     */
    public function test_blind_index_enables_exact_match_lookup(): void
    {
        $user = User::factory()->create(['email' => 'find@example.com']);

        $found = User::whereHashed('email', 'find@example.com')->first();
        $this->assertNotNull($found);
        $this->assertTrue($user->is($found));

        $row = DB::table('users')->where('id', $user->id)->first();
        $this->assertSame(app(PiiCrypter::class)->hash('find@example.com'), $row->email_hash);
        // Keyed HMAC — not a bare sha256 that could be dictionary-attacked.
        $this->assertNotSame(hash('sha256', 'find@example.com'), $row->email_hash);
    }

    /**
     * Search on an encrypted (blind-indexed) field is an exact match, not fuzzy.
     */
    public function test_search_on_encrypted_field_is_exact_match(): void
    {
        User::factory()->create(['first_name' => 'Alex']);
        User::factory()->create(['first_name' => 'Alexis']);

        $exact = User::list(['search' => 'Alex']);
        $this->assertSame(1, $exact->total());
        $this->assertSame('Alex', $exact->first()->first_name);

        // Case/whitespace-insensitive (blind index normalizes), still exact.
        $this->assertSame(1, User::list(['search' => '  alex '])->total());
        $this->assertSame(0, User::list(['search' => 'Ale'])->total());
    }

    /**
     * An undecryptable ciphertext (wrong/rotated key) reads as empty PII, not a crash.
     */
    public function test_undecryptable_ciphertext_reads_as_empty(): void
    {
        $user = User::factory()->create(['first_name' => 'Alex']);
        DB::table('users')->where('id', $user->id)->update(['ciphertext' => 'not-a-valid-ciphertext']);

        $fresh = User::find($user->id);

        $this->assertNull($fresh->first_name);
        $this->assertNull($fresh->email);
    }
}
