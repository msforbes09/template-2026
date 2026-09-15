<?php

namespace Tests\Feature\Administrators\Logs;

use App\Models\Administrators\Administrator;
use App\Models\Misc\Audits\Audit;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Misc\Connections\Connection;
use App\Services\Security\PiiCrypter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery;
use OpenSearch\Client;
use Tests\TestCase;

/**
 * End-to-end for the admin connection / auth-attempt / audit log lists: each reads
 * from its own OpenSearch alias when enabled, and is gated by its own permission.
 */
class OtherLogsListTest extends TestCase
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
     * Bind a mock OpenSearch client returning one hit with the given source; capture
     * the search params.
     */
    private function bindOpenSearch(array $source, ?array &$captured): void
    {
        $client = Mockery::mock(Client::class);
        $client->shouldReceive('search')->andReturnUsing(function (array $params) use ($source, &$captured) {
            $captured = $params;

            return ['hits' => ['total' => ['value' => 1], 'hits' => [['_source' => $source]]]];
        });

        $this->app->instance(Client::class, $client);
        config(['opensearch.read.enabled' => true]);
    }

    /**
     * The connection-log list reads from the connections alias with its filters.
     */
    public function test_connection_logs_list(): void
    {
        $this->actingWith(['connection-logs-view']);
        $captured = null;
        $this->bindOpenSearch([
            'id' => 1, 'type' => 'alpha', 'method' => 'POST', 'url' => '/x',
            'status_code' => '200', 'duration_ms' => 88, 'requested_at' => '2026-08-14 10:00:00',
        ], $captured);

        $this->getJson('/api/v1/administrator/connection-logs?type=alpha')
            ->assertOk()
            ->assertJsonPath('data.0.type', 'alpha')
            ->assertJsonPath('data.0.duration_ms', 88);

        $this->assertSame('template_connections', $captured['index']);
        $this->assertContains(['term' => ['type' => 'alpha']], $captured['body']['query']['bool']['filter']);
    }

    /**
     * `reference` is an exact-match term filter on OpenSearch, and a `where` on the
     * MySQL fallback — so an admin can pull every call made for one reference (a
     * masked mobile, an exchange code, a uniqid).
     */
    public function test_connection_logs_list_filters_by_reference(): void
    {
        $this->actingWith(['connection-logs-view']);
        $captured = null;
        $this->bindOpenSearch([
            'id' => 1, 'type' => 'alpha', 'method' => 'POST', 'url' => '/x', 'reference' => '+6391*****567',
            'status_code' => '200', 'duration_ms' => 88, 'requested_at' => '2026-08-14 10:00:00',
        ], $captured);

        $this->getJson('/api/v1/administrator/connection-logs?reference=%2B6391*****567')
            ->assertOk()
            ->assertJsonPath('data.0.reference', '+6391*****567');

        $this->assertContains(['term' => ['reference' => '+6391*****567']], $captured['body']['query']['bool']['filter']);

        // MySQL fallback applies the same filter.
        config(['opensearch.read.enabled' => false]);
        Connection::create(['type' => 'alpha', 'method' => 'POST', 'url' => '/x', 'reference' => 'REF-A', 'status_code' => '200', 'requested_at' => now()]);
        Connection::create(['type' => 'alpha', 'method' => 'POST', 'url' => '/x', 'reference' => 'REF-B', 'status_code' => '200', 'requested_at' => now()]);

        $this->getJson('/api/v1/administrator/connection-logs?reference=REF-A')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.reference', 'REF-A');
    }

    /**
     * The auth-attempt list reads from the auth_attempts alias and never surfaces a
     * raw identifier.
     */
    public function test_auth_attempt_logs_list(): void
    {
        $this->actingWith(['auth-logs-view']);
        $captured = null;
        $this->bindOpenSearch([
            'id' => 2, 'guard' => 'users', 'event' => 'invalid_credentials', 'identifier' => 'a•••@user.test', 'identifier_hash' => 'h',
            'user_type' => null, 'user_id' => null, 'ip_address' => '203.0.113.7',
            'attempted_at' => '2026-08-14 10:00:00',
        ], $captured);

        $this->getJson('/api/v1/administrator/auth-attempt-logs?guard=users')
            ->assertOk()
            ->assertJsonPath('data.0.event', 'invalid_credentials')
            // The MASKED identifier is listed (a failed-logins screen needs to show which
            // address was tried); the hash is internal.
            ->assertJsonPath('data.0.identifier', 'a•••@user.test')
            ->assertJsonMissingPath('data.0.identifier_hash');

        $this->assertSame('template_auth_attempts', $captured['index']);
    }

    /**
     * The audit list reads from the audits alias, sorted on created_at.
     */
    public function test_audit_logs_list(): void
    {
        $this->actingWith(['audit-logs-view']);
        $captured = null;
        $this->bindOpenSearch([
            'id' => 3, 'event' => 'updated', 'auditable_type' => 'User', 'auditable_id' => '42',
            'user_type' => 'Administrator', 'user_id' => 5, 'tags' => 'profile',
            'created_at' => '2026-08-14 10:00:00',
        ], $captured);

        $this->getJson('/api/v1/administrator/audit-logs?event=updated')
            ->assertOk()
            ->assertJsonPath('data.0.event', 'updated')
            ->assertJsonPath('data.0.auditable_type', 'User');

        $this->assertSame('template_audits', $captured['index']);
        $this->assertSame('created_at', array_key_first($captured['body']['sort'][0]));
    }

    /**
     * `auditable_id`, `user_type` and `user_id` are exact-match term filters — "every
     * change to record X" / "everything admin Y did" — on OpenSearch and on the MySQL
     * fallback.
     */
    public function test_audit_logs_list_filters_by_subject_and_actor(): void
    {
        $this->actingWith(['audit-logs-view']);
        $captured = null;
        $this->bindOpenSearch([
            'id' => 3, 'event' => 'updated', 'auditable_type' => 'User', 'auditable_id' => '42',
            'user_type' => 'Administrator', 'user_id' => 5, 'tags' => null, 'created_at' => '2026-08-14 10:00:00',
        ], $captured);

        $this->getJson('/api/v1/administrator/audit-logs?auditable_type=User&auditable_id=42&user_type=Administrator&user_id=5')->assertOk();

        $filter = $captured['body']['query']['bool']['filter'];
        $this->assertContains(['term' => ['auditable_id' => '42']], $filter);
        $this->assertContains(['term' => ['user_type' => 'Administrator']], $filter);
        $this->assertContains(['term' => ['user_id' => '5']], $filter);

        config(['opensearch.read.enabled' => false]);
        Audit::create(['event' => 'updated', 'auditable_type' => 'User', 'auditable_id' => '42', 'user_type' => 'Administrator', 'user_id' => 5, 'created_at' => now()]);
        Audit::create(['event' => 'updated', 'auditable_type' => 'User', 'auditable_id' => '43', 'user_type' => 'Administrator', 'user_id' => 5, 'created_at' => now()]);
        Audit::create(['event' => 'updated', 'auditable_type' => 'User', 'auditable_id' => '42', 'user_type' => 'User', 'user_id' => 5, 'created_at' => now()]);

        $this->getJson('/api/v1/administrator/audit-logs?auditable_id=42')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/administrator/audit-logs?user_type=Administrator&user_id=5')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/administrator/audit-logs?auditable_id=42&user_type=User')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.user_type', 'User');
    }

    /**
     * `user_type` / `user_id` are exact-match term filters on the auth-attempt list —
     * "every login event for this account" — on OpenSearch and the MySQL fallback.
     */
    public function test_auth_attempt_logs_list_filters_by_actor(): void
    {
        $this->actingWith(['auth-logs-view']);
        $captured = null;
        $this->bindOpenSearch([
            'id' => 2, 'guard' => 'users', 'event' => 'authenticated', 'identifier_hash' => 'h',
            'user_type' => 'User', 'user_id' => 9, 'ip_address' => '203.0.113.7', 'attempted_at' => '2026-08-14 10:00:00',
        ], $captured);

        $this->getJson('/api/v1/administrator/auth-attempt-logs?user_type=User&user_id=9')->assertOk();

        $filter = $captured['body']['query']['bool']['filter'];
        $this->assertContains(['term' => ['user_type' => 'User']], $filter);
        $this->assertContains(['term' => ['user_id' => '9']], $filter);

        config(['opensearch.read.enabled' => false]);
        AuthAttempt::create(['guard' => 'users', 'event' => 'authenticated', 'identifier' => 'a@x.test', 'identifier_hash' => 'h1', 'user_type' => 'User', 'user_id' => 9, 'ip_address' => '203.0.113.7', 'attempted_at' => now()]);
        AuthAttempt::create(['guard' => 'users', 'event' => 'authenticated', 'identifier' => 'b@x.test', 'identifier_hash' => 'h2', 'user_type' => 'User', 'user_id' => 10, 'ip_address' => '203.0.113.7', 'attempted_at' => now()]);
        AuthAttempt::create(['guard' => 'administrators', 'event' => 'authenticated', 'identifier' => 'c@x.test', 'identifier_hash' => 'h3', 'user_type' => 'Administrator', 'user_id' => 9, 'ip_address' => '203.0.113.7', 'attempted_at' => now()]);

        $this->getJson('/api/v1/administrator/auth-attempt-logs?user_id=9')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/administrator/auth-attempt-logs?user_type=User&user_id=9')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.user_type', 'User');
    }

    /**
     * `identifier` (an email / mobile as typed by the admin) is never matched raw: it
     * is HMAC-hashed with the PII key and applied as an exact term on `identifier_hash`
     * — on OpenSearch and on the MySQL fallback — so every attempt for that address
     * is found without the log ever holding the plaintext.
     */
    public function test_auth_attempt_logs_list_filters_by_identifier_via_hash(): void
    {
        $this->actingWith(['auth-logs-view']);
        $hash = app(PiiCrypter::class)->hash('alex@user.test');
        $captured = null;
        $this->bindOpenSearch([
            'id' => 2, 'guard' => 'users', 'event' => 'invalid_credentials', 'identifier_hash' => $hash,
            'user_type' => null, 'user_id' => null, 'ip_address' => '203.0.113.7', 'attempted_at' => '2026-08-14 10:00:00',
        ], $captured);

        $this->getJson('/api/v1/administrator/auth-attempt-logs?identifier=Alex%40user.test')->assertOk();

        $filter = $captured['body']['query']['bool']['filter'];
        $this->assertContains(['term' => ['identifier_hash' => $hash]], $filter);
        $this->assertStringNotContainsString('user.test', json_encode($captured));

        config(['opensearch.read.enabled' => false]);
        AuthAttempt::create(['guard' => 'users', 'event' => 'invalid_credentials', 'identifier' => 'a•••@user.test', 'identifier_hash' => $hash, 'ip_address' => '203.0.113.7', 'attempted_at' => now()]);
        AuthAttempt::create(['guard' => 'users', 'event' => 'invalid_credentials', 'identifier' => 'm•••@user.test', 'identifier_hash' => app(PiiCrypter::class)->hash('morgan@user.test'), 'ip_address' => '203.0.113.7', 'attempted_at' => now()]);

        $this->getJson('/api/v1/administrator/auth-attempt-logs?identifier=alex@user.test')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonMissingPath('data.0.identifier_hash');
    }

    /**
     * Each endpoint is gated by its own permission — the gateway-logs permission
     * does not grant them.
     */
    public function test_endpoints_require_their_own_permission(): void
    {
        $this->actingWith(['gateway-logs-view']);

        $this->getJson('/api/v1/administrator/connection-logs')->assertForbidden();
        $this->getJson('/api/v1/administrator/auth-attempt-logs')->assertForbidden();
        $this->getJson('/api/v1/administrator/audit-logs')->assertForbidden();
    }
}
