<?php

namespace Tests\Feature\Administrators\Administrators;

use App\Mail\Administrators\TemporaryPasswordMail;
use App\Models\Administrators\Administrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * An administrator's email address cannot be changed through the management endpoints.
 *
 * It was an account-takeover primitive: point a colleague's email at an address you
 * control, trigger their password reset, and the temporary password arrives in your
 * inbox. Nothing was granted to you, so the no-privilege-amplification rule never fired
 * — you simply became someone who already held the permissions you wanted.
 */
class AdministratorEmailTakeoverTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Act as an admin who can manage other administrators.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(
            Administrator::factory()->create(['with_temporary_password' => false]),
            ['administrators-view', 'administrators-manage'],
            'administrators',
        );
    }

    /**
     * The email in the payload is discarded — the request still succeeds, but the
     * address does not move.
     *
     * Ignored rather than rejected so that a client echoing the record back unchanged
     * (the usual edit-form shape) keeps working. The trade is a silent no-op for a
     * manager who genuinely meant to change an address: they get a 200 and nothing
     * happens. Same precedent as `is_active` on this endpoint.
     */
    public function test_the_management_endpoint_ignores_an_email_change(): void
    {
        $victim = Administrator::factory()->create(['email' => 'victim@example.com']);

        $this->putJson("/api/v1/administrator/administrators/{$victim->id}", [
            'first_name' => 'Renamed',
            'email' => 'attacker@evil.test',
        ])->assertOk();

        $victim->refresh();

        $this->assertSame('Renamed', $victim->first_name, 'The rest of the payload still applies.');
        $this->assertSame('victim@example.com', $victim->email, 'The address must not have moved.');
    }

    /**
     * The whole takeover chain, end to end: swap the address, then reset the password
     * and collect it. The temporary password must still reach the real owner.
     */
    public function test_the_takeover_chain_is_dead(): void
    {
        Mail::fake();

        $victim = Administrator::factory()->create(['email' => 'victim@example.com']);

        // Step 1 — repoint the victim's email. Accepted, but discarded.
        $this->putJson("/api/v1/administrator/administrators/{$victim->id}", [
            'email' => 'attacker@evil.test',
        ])->assertOk();

        $this->assertSame('victim@example.com', $victim->fresh()->email);

        // Step 2 — reset their password anyway, and see where it lands.
        $this->postJson("/api/v1/administrator/administrators/{$victim->id}/reset-password")
            ->assertOk();

        Mail::assertSent(
            TemporaryPasswordMail::class,
            fn (TemporaryPasswordMail $mail): bool => $mail->hasTo('victim@example.com')
                && ! $mail->hasTo('attacker@evil.test'),
        );
    }

    /**
     * The endpoint still does its actual job: name and photo remain updatable.
     */
    public function test_the_other_fields_are_still_updatable(): void
    {
        $administrator = Administrator::factory()->create(['first_name' => 'Old']);

        $this->putJson("/api/v1/administrator/administrators/{$administrator->id}", [
            'first_name' => 'New',
            'last_name' => 'Name',
        ])->assertOk();

        $this->assertSame('New', $administrator->fresh()->first_name);
    }
}
