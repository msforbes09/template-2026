<?php

namespace Tests\Feature\Administrators\Logs;

use App\Models\Administrators\Administrator;
use App\Models\Misc\Audits\Audit;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Misc\Connections\Connection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The admin connection / auth-attempt / audit detail shows read the full record
 * from MySQL, mask the auth identifier, and 404 on unknown ids.
 */
class OtherLogsShowTest extends TestCase
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
     * The connection show returns the full masked-at-write body.
     */
    public function test_connection_show_returns_full_record(): void
    {
        $this->actingWith(['connection-logs-view']);
        $log = Connection::create([
            'type' => 'sms', 'method' => 'POST', 'url' => '/x',
            'payload' => ['number' => '+639*******67'], 'response' => ['ok' => true],
            'status_code' => '200', 'duration_ms' => 88, 'requested_at' => now(),
        ]);

        $this->getJson("/api/v1/administrator/connection-logs/{$log->id}")
            ->assertOk()
            ->assertJsonPath('data.type', 'sms')
            ->assertJsonPath('data.payload.number', '+639*******67')
            ->assertJsonPath('data.response.ok', true);
    }

    /**
     * The auth-attempt show masks the raw identifier but keeps the hash.
     */
    public function test_auth_attempt_show_masks_identifier(): void
    {
        $this->actingWith(['auth-logs-view']);
        $log = AuthAttempt::create([
            'guard' => 'administrators', 'event' => 'invalid_credentials',
            'identifier' => 'administrator@example.test', 'identifier_hash' => 'abc123',
            'ip_address' => '203.0.113.7', 'attempted_at' => now(),
        ]);

        $response = $this->getJson("/api/v1/administrator/auth-attempt-logs/{$log->id}")
            ->assertOk()
            ->assertJsonPath('data.event', 'invalid_credentials')
            ->assertJsonMissingPath('data.identifier_hash');

        // The raw identifier is never returned verbatim.
        $this->assertNotSame('administrator@example.test', $response->json('data.identifier'));
    }

    /**
     * The audit show returns the old/new value change set.
     */
    public function test_audit_show_returns_change_set(): void
    {
        $this->actingWith(['audit-logs-view']);
        $log = Audit::create([
            'event' => 'updated', 'auditable_type' => 'User', 'auditable_id' => '42',
            'old_values' => ['status' => 'pending'], 'new_values' => ['status' => 'approved'],
            'user_type' => 'Administrator', 'user_id' => 5, 'created_at' => now(),
        ]);

        $this->getJson("/api/v1/administrator/audit-logs/{$log->id}")
            ->assertOk()
            ->assertJsonPath('data.old_values.status', 'pending')
            ->assertJsonPath('data.new_values.status', 'approved');
    }

    /**
     * The composite list id ("{Y_m}:{id}") locates the record without a ?month.
     */
    public function test_show_by_composite_id(): void
    {
        $this->actingWith(['audit-logs-view']);
        $log = Audit::create([
            'event' => 'updated', 'auditable_type' => 'User', 'auditable_id' => '42',
            'user_type' => 'Administrator', 'user_id' => 5, 'created_at' => now(),
        ]);

        // The list id is the composite scout key.
        $reference = $log->getScoutKey();
        $this->assertStringContainsString(':', $reference);

        $this->getJson("/api/v1/administrator/audit-logs/{$reference}")
            ->assertOk()
            ->assertJsonPath('data.id', $reference)
            ->assertJsonPath('data.event', 'updated');
    }

    /**
     * A composite id whose month differs from the current month resolves against the
     * correct monthly table (regression: the key must be qualified with the target
     * table, not the current-month table).
     */
    public function test_show_by_composite_id_from_a_previous_month(): void
    {
        Carbon::setTestNow('2026-08-15 09:00:00');
        $this->actingWith(['audit-logs-view']);

        // Write into last month's table.
        Carbon::setTestNow('2026-07-10 09:00:00');
        $log = Audit::create([
            'event' => 'updated', 'auditable_type' => 'User', 'auditable_id' => '7',
            'user_type' => 'Administrator', 'user_id' => 5, 'created_at' => now(),
        ]);
        $reference = $log->getScoutKey();
        Carbon::setTestNow('2026-08-15 09:00:00');

        $this->assertStringStartsWith('2026_07:', $reference);

        $this->getJson("/api/v1/administrator/audit-logs/{$reference}")
            ->assertOk()
            ->assertJsonPath('data.id', $reference)
            ->assertJsonPath('data.auditable_id', '7');

        Carbon::setTestNow();
    }

    /**
     * An unknown id is a 404.
     */
    public function test_unknown_id_is_not_found(): void
    {
        $this->actingWith(['connection-logs-view']);

        $this->getJson('/api/v1/administrator/connection-logs/999999')->assertNotFound();
    }

    /**
     * Show is gated by the same per-type permission as the list.
     */
    public function test_show_requires_permission(): void
    {
        $this->actingWith(['gateway-logs-view']);

        $this->getJson('/api/v1/administrator/audit-logs/1')->assertForbidden();
    }
}
