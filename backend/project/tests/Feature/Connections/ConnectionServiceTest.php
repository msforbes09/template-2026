<?php

namespace Tests\Feature\Connections;

use App\Events\Connections\ConnectionRequested;
use App\Services\Connections\ConnectionService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Tests the outbound-call funnel + redaction in ConnectionService.
 */
class ConnectionServiceTest extends TestCase
{
    /**
     * A concrete test service exposing request().
     */
    private function service(): ConnectionService
    {
        return new class extends ConnectionService
        {
            protected string $type = 'test';

            /**
             * @param  array<string, mixed>  $payload
             * @return array<string, mixed>
             */
            public function run(string $method, string $url, array $payload = [], ?string $reference = null): array
            {
                return $this->request($method, $url, $payload, [], [], $reference);
            }
        };
    }

    /**
     * A service whose mask keys form an invalid regex (a config typo).
     */
    private function brokenMaskService(): ConnectionService
    {
        return new class extends ConnectionService
        {
            protected string $type = 'test';

            protected array $maskKeys = ['[unterminated'];

            /**
             * @param  array<string, mixed>  $payload
             * @return array<string, mixed>
             */
            public function run(string $method, string $url, array $payload = [], ?string $reference = null): array
            {
                return $this->request($method, $url, $payload, [], [], $reference);
            }
        };
    }

    /**
     * F22 — if the mask pattern fails to compile (a bad config fragment), redaction
     * FAILS CLOSED: benign fields are redacted rather than silently passed through,
     * so one typo can never un-redact every secret/PII field.
     */
    public function test_broken_mask_pattern_fails_closed(): void
    {
        Event::fake([ConnectionRequested::class]);
        Http::fake(['*' => Http::response(['ok' => 1], 200)]);

        $this->brokenMaskService()->run('POST', 'https://svc.example/x', ['label' => 'benign-value']);

        Event::assertDispatched(ConnectionRequested::class, function ($e) {
            return $e->record['payload']['label'] === '***';
        });
    }

    /**
     * A successful call returns the decoded body and dispatches a redacted log.
     */
    public function test_logs_and_redacts_a_successful_call(): void
    {
        Event::fake([ConnectionRequested::class]);
        Http::fake(['*' => Http::response(['ok' => 1, 'data' => [
            'photo' => 'data:image/png;base64,'.str_repeat('A', 200),
            'attachment' => 'data:image/png;base64,'.str_repeat('A', 200),
            'first_name' => 'Alex',
            'label' => 'Alex',
        ]], 200)]);

        $result = $this->service()->run('POST', 'https://svc.example/token', ['partner_secret' => 'super', 'scope' => 'X'], 'EXC-1');

        $this->assertSame(1, $result['ok']);

        Event::assertDispatched(ConnectionRequested::class, function (ConnectionRequested $e) {
            $r = $e->record;

            return $r['type'] === 'test'
                && $r['reference'] === 'EXC-1'
                && $r['method'] === 'POST'
                && $r['status_code'] === 200
                && is_int($r['duration_ms'])
                && $r['payload']['partner_secret'] === '***'                    // masked by key (secret)
                && $r['payload']['scope'] === 'X'
                && $r['response']['data']['photo'] === '***'                    // masked by key (PII) — beats the base64 stripper
                && $r['response']['data']['attachment'] === '[base64 stripped]' // non-PII blob: still stripped, not masked
                && $r['response']['data']['first_name'] === '***'               // masked by key (PII)
                && $r['response']['data']['label'] === 'Alex';                  // ordinary field: untouched
        });
    }

    /**
     * partner_code is a live SSO gateway credential (it authenticates SSO
     * code-paths on the primary field alone), so it is redacted in the log like
     * any other secret — never persisted verbatim into connections.payload.
     */
    public function test_redacts_partner_code(): void
    {
        Event::fake([ConnectionRequested::class]);
        Http::fake(['*' => Http::response(['ok' => 1], 200)]);

        $this->service()->run('POST', 'https://svc.example/token', [
            'partner_code' => 'REAL-ACCESS-CODE',
            'exchange_code' => 'EXC-1',
        ], 'EXC-1');

        Event::assertDispatched(ConnectionRequested::class, function (ConnectionRequested $e) {
            return $e->record['payload']['partner_code'] === '***';
        });
    }

    /**
     * A transport failure records the exception, logs it, and rethrows.
     */
    public function test_transport_failure_records_exception_and_rethrows(): void
    {
        Event::fake([ConnectionRequested::class]);
        Http::fake(fn () => throw new ConnectionException('host unreachable'));

        try {
            $this->service()->run('POST', 'https://svc.example/token', [], 'EXC-2');
            $this->fail('Expected the exception to propagate.');
        } catch (ConnectionException $e) {
            $this->assertStringContainsString('host unreachable', $e->getMessage());
        }

        Event::assertDispatched(ConnectionRequested::class, fn (ConnectionRequested $e) => $e->record['reference'] === 'EXC-2'
            && str_contains((string) $e->record['exception'], 'host unreachable')
            && $e->record['status_code'] === null);
    }

    /**
     * Oversized string fields are truncated.
     */
    public function test_truncates_oversized_fields(): void
    {
        Event::fake([ConnectionRequested::class]);
        Http::fake(['*' => Http::response(['blob' => str_repeat('x', 20000)], 200)]);

        $this->service()->run('POST', 'https://svc.example/x', [], 'EXC-3');

        Event::assertDispatched(ConnectionRequested::class, function (ConnectionRequested $e) {
            $blob = $e->record['response']['blob'];

            return str_ends_with($blob, '…[truncated]') && mb_strlen($blob) < 20000;
        });
    }
}
