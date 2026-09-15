<?php

namespace Tests\Feature\Security;

use App\Enums\AuthEventEnum;
use App\Models\Administrators\Administrator;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Users\User;
use App\Services\Security\AuthAttemptRecorder;
use App\Services\Security\PiiCrypter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * The authentication trail: every success and every failure, for both guards.
 *
 * Without it a brute-force against the admin login left no trace at all — and a
 * trail of failures alone cannot tell you the story that matters, which is ten
 * failures followed by a success.
 *
 * User identifiers are stored hashed only. The users table encrypts PII at rest
 * behind a keyed-HMAC blind index; writing a user's plaintext email into a log
 * table would put it straight back.
 */
class AuthAttemptLogTest extends TestCase
{
    use RefreshDatabase;

    /**
     * An active admin with a known password.
     */
    private function admin(): Administrator
    {
        return Administrator::factory()->create([
            'email' => 'ada@admin.test',
            'password' => Hash::make('secret-password'),
            'is_active' => true,
            'with_temporary_password' => false,
        ]);
    }

    /**
     * The most recent attempt row.
     */
    private function lastAttempt(): ?AuthAttempt
    {
        return AuthAttempt::query()->orderByDesc('id')->first();
    }

    /**
     * A successful login is recorded — not just failures. Ten failures followed by a
     * success is a *successful* brute-force, and failures alone cannot show that.
     */
    public function test_a_successful_login_is_recorded(): void
    {
        $admin = $this->admin();

        $admin->authenticate();

        $attempt = $this->lastAttempt();

        $this->assertSame(AuthEventEnum::SUCCEEDED->value, $attempt->event);
        $this->assertSame(Administrator::AUTH_GUARD, $attempt->guard);
        $this->assertSame('a•••@admin.test', $attempt->identifier);
        $this->assertSame((int) $admin->id, (int) $attempt->user_id);
        $this->assertSame('Administrator', $attempt->user_type);
        $this->assertNotNull($attempt->attempted_at);
    }

    /**
     * A wrong password is recorded, with the attempted identifier, even though no
     * account was resolved.
     */
    public function test_a_wrong_password_is_recorded(): void
    {
        $this->admin();

        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'ada@admin.test',
            'password' => 'wrong-password',
        ]);

        $attempt = $this->lastAttempt();

        $this->assertSame(AuthEventEnum::INVALID_CREDENTIALS->value, $attempt->event);
        $this->assertSame('a•••@admin.test', $attempt->identifier);
    }

    /**
     * An attempt against an address that matches no account is still recorded —
     * credential spraying must not be invisible.
     */
    public function test_an_attempt_on_an_unknown_address_is_recorded(): void
    {
        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'nobody@admin.test',
            'password' => 'whatever',
        ]);

        $attempt = $this->lastAttempt();

        $this->assertSame(AuthEventEnum::INVALID_CREDENTIALS->value, $attempt->event);
        $this->assertSame('n•••@admin.test', $attempt->identifier);
        $this->assertNull($attempt->user_id);
    }

    /**
     * A login against a switched-off account is recorded distinctly.
     */
    public function test_an_inactive_account_attempt_is_recorded(): void
    {
        $admin = $this->admin();
        $admin->update(['is_active' => false]);

        $this->postJson('/api/v1/administrator/authenticate', [
            'email' => 'ada@admin.test',
            'password' => 'secret-password',
        ]);

        $this->assertSame(AuthEventEnum::ACCOUNT_INACTIVE->value, $this->lastAttempt()->event);
    }

    /**
     * Logging out is recorded.
     */
    public function test_a_logout_is_recorded(): void
    {
        $admin = $this->admin();

        $admin->logout();

        $this->assertSame(AuthEventEnum::LOGGED_OUT->value, $this->lastAttempt()->event);
    }

    /**
     * Changing a password is recorded.
     */
    public function test_a_password_change_is_recorded(): void
    {
        $admin = $this->admin();

        $admin->changePassword('a-new-password');

        // changePassword now re-authenticates (revoke + reissue), so it records
        // PASSWORD_CHANGED and then a SUCCEEDED login — assert the change was logged.
        $this->assertTrue(
            AuthAttempt::where('event', AuthEventEnum::PASSWORD_CHANGED->value)->exists(),
        );
    }

    /**
     * A user's identifier is stored HASHED plus MASKED, never in plaintext.
     *
     * The users table keeps PII encrypted at rest behind a keyed-HMAC blind index.
     * Writing the raw email into a log table would undo that — so the log stores the
     * same hash (counting + joining back to the account still work) plus a masked
     * identifier (recognisable to an admin, not harvestable).
     */
    public function test_a_citizen_identifier_is_hashed_and_stored_masked_only(): void
    {
        $user = User::factory()->create(['email' => 'alex@user.test']);

        $user->authenticate();

        $attempt = $this->lastAttempt();

        $this->assertSame(User::AUTH_GUARD, $attempt->guard);
        $this->assertSame('a•••@user.test', $attempt->identifier);
        $this->assertSame(app(PiiCrypter::class)->hash('alex@user.test'), $attempt->identifier_hash);
    }

    /**
     * A user mobile identifier is stored with the phone mask (first 5 + last 3).
     */
    public function test_a_citizen_mobile_identifier_is_stored_masked(): void
    {
        app(AuthAttemptRecorder::class)->record(User::AUTH_GUARD, AuthEventEnum::INVALID_CREDENTIALS, '+639171234567');

        $attempt = $this->lastAttempt();

        $this->assertSame('+6391•••••567', $attempt->identifier);
        $this->assertSame(app(PiiCrypter::class)->hash('+639171234567'), $attempt->identifier_hash);
    }

    /**
     * An admin identifier is stored MASKED *and* hashed, like a user's — the log
     * never holds a raw address for any guard; the hash is the correlation key.
     */
    public function test_an_admin_identifier_is_stored_masked_and_hashed(): void
    {
        $admin = $this->admin();

        $admin->authenticate();

        $attempt = $this->lastAttempt();

        $this->assertSame('a•••@admin.test', $attempt->identifier);
        $this->assertSame(app(PiiCrypter::class)->hash('ada@admin.test'), $attempt->identifier_hash);
    }

    /**
     * Rows land in the current month's table, like the connection log.
     */
    public function test_rows_land_in_the_monthly_table(): void
    {
        $this->assertSame('auth_attempts_'.now()->format('Y_m'), (new AuthAttempt)->getTable());
    }
}
