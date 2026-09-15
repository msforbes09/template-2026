<?php

namespace App\Services\Connections;

use App\Events\Connections\ConnectionRequested;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

/**
 * Base for services making outbound external API calls. Every call funnels
 * through request(), which times it, captures a redacted request/response
 * record, and queues it to the connection log — without ever breaking the caller.
 */
abstract class ConnectionService
{
    /**
     * Log type identifier for this integration (e.g. 'payments').
     */
    protected string $type;

    /**
     * Credential-bearing key fragments, masked in every logged request.
     *
     * @var list<string>
     */
    private const SECRET_KEYS = [
        'secret', 'password', 'token', 'signature', 'authorization', 'api.?key', 'pcn', 'national_id',
        'otp', '(^|_)pin($|_)', // OTP codes + PINs (word-bounded: `shipping`/`mapping` are not PINs)
        'access_code', // single-field token-exchange credential
        'partner_code', // partner access code — a credential on its own
    ];

    /**
     * Personal-data key fragments, masked in every logged request.
     *
     * Masked here — in the base client — rather than per integration, so a new
     * connection logger is safe by default instead of leaking until someone
     * remembers to opt in. The `users` table keeps these fields encrypted at rest
     * behind a blind index; writing them to the connection log in the clear would
     * hand back everything that buys.
     *
     * Geographic `*_code` values are deliberately absent: they carry no personal
     * data, they are what the address tables join on, and a log stripped of all
     * context is a log nobody can use.
     *
     * @var list<string>
     */
    private const PII_KEYS = [
        'email', 'mobile', 'first_name', 'middle_name', 'last_name', 'suffix',
        'birth_date', 'gender', 'street', 'foreign_address', 'address_line',
        'postal_code', 'photo',
        // Profile payloads: address NAMES (end-anchored so the geographic `*_code`
        // values stay — they carry no PII and are what the address tables join on),
        // and the JSON/personal blobs.
        'barangay$', 'municipality$', 'region$', 'province$',
        'health_data', 'birth_place', 'other_personal_information', 'mother_details', 'father_details',
        'emergency_information', 'expected_salary', 'educational_attainment', 'passport',
    ];

    /**
     * Extra key fragments (regex-safe) to mask on top of the defaults.
     *
     * @var list<string>
     */
    protected array $maskKeys = [];

    /**
     * Total request timeout (seconds).
     */
    protected int $timeout = 30;

    /**
     * Connection-establishment timeout (seconds).
     */
    protected int $connectTimeout = 10;

    /**
     * Number of attempts.
     */
    protected int $retries = 1;

    /**
     * Per-field size cap (bytes) for logged headers/params/payload/response.
     */
    private const MAX_FIELD_BYTES = 16384;

    /**
     * Issue an outbound request and log it (redacted, queued). Returns the
     * decoded JSON response, or `['raw' => body]` for a non-JSON (e.g. text)
     * body; rethrows transport exceptions.
     *
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $headers
     * @param  array<string, mixed>  $params
     * @param  array{0: string, 1: string}|null  $basicAuth
     * @param  array{user_type: string, user_id: int}|null  $causer  Explicit causer for calls made outside a request (queued jobs); null resolves it from the auth guards.
     * @return array<string, mixed>
     */
    protected function request(string $method, string $url, array $payload = [], array $headers = [], array $params = [], ?string $reference = null, ?array $basicAuth = null, ?array $causer = null): array
    {
        $method = strtoupper($method);
        $startedAt = microtime(true);

        $record = [
            'type' => $this->type,
            'reference' => $reference ? Str::of($reference)->limit(100, '')->replace(' ', '_')->value() : null,
            'method' => $method,
            'url' => $url,
            'headers' => $headers,
            'params' => $params,
            'payload' => $method === 'GET' ? [] : $payload,
            'status_code' => null,
            'response' => null,
            'exception' => null,
            'ip_address' => request()?->ip(),
        ] + ($causer ?? $this->causer());

        try {
            $client = Http::timeout($this->timeout)->connectTimeout($this->connectTimeout)->retry($this->retries, 100, throw: false)->withHeaders($headers);

            if ($basicAuth) {
                $client = $client->withBasicAuth($basicAuth[0], $basicAuth[1]);
            }

            $options = $method === 'GET' ? ['query' => $params] : ['json' => $payload, 'query' => $params];
            $response = $client->send($method, $url, $options);

            $record['status_code'] = $response->status();
            $record['response'] = $response->json() ?? ['raw' => $response->body()];

            return $response->json() ?? ['raw' => $response->body()];
        } catch (Throwable $e) {
            $record['exception'] = $e::class.': '.$e->getMessage();

            throw $e;
        } finally {
            $record['duration_ms'] = (int) round((microtime(true) - $startedAt) * 1000);
            $record['requested_at'] = now();

            $this->log($record);
        }
    }

    /**
     * Redact and queue the record. Logging failures never break the caller.
     *
     * @param  array<string, mixed>  $record
     */
    private function log(array $record): void
    {
        try {
            foreach (['headers', 'params', 'payload', 'response'] as $field) {
                $record[$field] = $this->redact($record[$field]);
            }

            ConnectionRequested::dispatch($record);
        } catch (Throwable) {
            // Intentionally swallowed — logging must not break the caller.
        }
    }

    /**
     * Recursively redact secrets, strip base64 blobs, and cap field size.
     * Protected so alternate loggers (e.g. the partner gateway) reuse the same
     * masking rather than reimplementing them.
     */
    protected function redact(mixed $data, ?string $key = null): mixed
    {
        // Fail CLOSED: preg_match returns 1 (match), 0 (no match), or false (the
        // pattern failed to compile — e.g. a bad config fragment). Redact on 1 AND
        // false, so a single malformed mask key can never silently un-redact every
        // secret/PII field; only an explicit 0 (definite no-match) passes through (F22).
        if (is_string($key) && @preg_match($this->maskPattern(), $key) !== 0) {
            return '***';
        }

        if (is_array($data)) {
            $out = [];
            foreach ($data as $k => $v) {
                $out[$k] = $this->redact($v, is_string($k) ? $k : null);
            }

            return $out;
        }

        if (is_string($data)) {
            if (strlen($data) > 100 && str_contains($data, 'base64,')) {
                return '[base64 stripped]';
            }

            if (strlen($data) > self::MAX_FIELD_BYTES) {
                return mb_substr($data, 0, self::MAX_FIELD_BYTES).'…[truncated]';
            }
        }

        return $data;
    }

    /**
     * The key-mask regex (defaults + subclass extras).
     */
    private function maskPattern(): string
    {
        $keys = array_merge(self::SECRET_KEYS, self::PII_KEYS, $this->maskKeys);

        return '/'.implode('|', $keys).'/i';
    }

    /**
     * The initiating causer (Administrator or User) as morph type + id, if any.
     * Guards that are not configured (e.g. `user` before that feature ships) are
     * skipped.
     *
     * @return array<string, mixed>
     */
    protected function causer(): array
    {
        foreach (['administrators', 'users'] as $guard) {
            if (! config("auth.guards.{$guard}")) {
                continue;
            }

            $user = Auth::guard($guard)->user();

            if ($user instanceof Authenticatable) {
                return ['user_type' => $user->getMorphClass(), 'user_id' => $user->getKey()];
            }
        }

        return ['user_type' => null, 'user_id' => null];
    }
}
