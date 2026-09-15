<?php

namespace App\Models\Misc\AuthAttempts;

use App\Models\Concerns\HasMonthlyTable;
use App\Models\Concerns\SearchableLog;
use App\Services\Security\PiiCrypter;
use App\Services\Security\PiiMasker;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A single authentication event — success or failure, admin or user — written to
 * a per-month table (auth_attempts_YYYY_MM) on the logging connection.
 *
 * On the two identifier columns: `identifier` holds the MASKED address for every guard
 * (`a•••@example.com`, `+6391•••••567`) — recognisable to an admin, never the
 * plaintext — because the users table keeps PII encrypted at rest behind a keyed-HMAC
 * blind index and writing the plaintext here would put it straight back (and staff
 * addresses get the same treatment). `identifier_hash` is always written, using that
 * same HMAC — so counting attempts per address, and joining back to a user via
 * `users.email_hash`, both still work.
 */
class AuthAttempt extends Model
{
    use HasMonthlyTable;
    use SearchableLog;

    /**
     * Bare OpenSearch index name (prefixed by SearchableLog::searchableAs()).
     */
    public const RESOURCE_KEY = 'auth_attempts';

    /**
     * Base name for the monthly partitioning (auth_attempts_YYYY_MM).
     */
    protected string $baseTable = 'auth_attempts';

    /**
     * These rows carry their own attempted_at; no created_at/updated_at.
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'guard', 'event', 'identifier', 'identifier_hash', 'ciphertext',
        'user_type', 'user_id', 'ip_address', 'user_agent', 'attempted_at',
    ];

    /**
     * Resolve the model's connection from config (the shared logs connection).
     */
    public function __construct(array $attributes = [])
    {
        $this->setConnection(config('connection.log_connection'));

        parent::__construct($attributes);
    }

    /**
     * The account the attempt resolved to, when it resolved to one at all.
     */
    public function user(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempted_at' => 'datetime',
        ];
    }

    /**
     * The OpenSearch document — indexes the MASKED `identifier` and the blind-index
     * `identifier_hash`, never a raw address. `month` + `id` key back to the row.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'month' => $this->scoutMonth(),
            'guard' => $this->guard,
            'event' => $this->event,
            'identifier' => PiiMasker::maskIdentifier($this->identifier),
            'identifier_hash' => $this->identifier_hash,
            'user_type' => $this->user_type,
            'user_id' => $this->user_id,
            'ip_address' => $this->ip_address,
            'attempted_at' => $this->attempted_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * This log's month partition + list range/sort are keyed on `attempted_at`.
     */
    public function scoutDateColumn(): string
    {
        return 'attempted_at';
    }

    /**
     * The minimal list shape for the admin auth-attempt viewer — the MASKED identifier
     * is listed (a failed-logins screen shows which address was tried); a raw address is
     * never stored, indexed, or surfaced.
     *
     * @return array<string, mixed>
     */
    public function toListArray(): array
    {
        return [
            'id' => $this->getScoutKey(),
            'guard' => $this->guard,
            'event' => $this->event,
            'identifier' => PiiMasker::maskIdentifier($this->identifier),
            'user_type' => $this->user_type,
            'user_id' => $this->user_id,
            'ip_address' => $this->ip_address,
            'attempted_at' => $this->attempted_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * The OpenSearch field mapping for this log's index (mirrors the lean document:
     * the masked identifier + the blind-index hash, never a raw address).
     *
     * @return array<string, array<string, mixed>>
     */
    public static function searchableMapping(): array
    {
        return [
            'id' => ['type' => 'long'],
            'month' => ['type' => 'keyword'],
            'guard' => ['type' => 'keyword'],
            'event' => ['type' => 'keyword'],
            'identifier' => ['type' => 'keyword'],
            'identifier_hash' => ['type' => 'keyword'],
            'user_type' => ['type' => 'keyword'],
            'user_id' => ['type' => 'long'],
            'ip_address' => ['type' => 'ip'],
            'attempted_at' => ['type' => 'date', 'format' => 'yyyy-MM-dd HH:mm:ss'],
        ];
    }

    /**
     * Build a month's auth-attempt table schema on the logging connection.
     */
    /**
     * Decrypt one field from the at-rest `ciphertext` blob (an encrypted JSON map,
     * like `users.ciphertext` — extendable with more fields later). Null for legacy
     * rows written before the blob existed.
     */
    public function revealPii(string $field): ?string
    {
        return app(PiiCrypter::class)->decrypt($this->ciphertext)[$field] ?? null;
    }

    /**
     * The decrypted identifier, for the gated, audited reveal endpoint.
     */
    public function revealIdentifier(): ?string
    {
        return $this->revealPii('identifier');
    }

    protected function createMonthlyTable(string $tableName): void
    {
        Schema::connection($this->getConnectionName())->create($tableName, function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('guard', 32)->index();
            $table->string('event', 32)->index();
            $table->string('identifier', 191)->nullable()->index();
            $table->string('identifier_hash', 64)->nullable()->index();
            $table->text('ciphertext')->nullable();
            $table->string('user_type')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->ipAddress('ip_address')->nullable()->index();
            $table->text('user_agent')->nullable();
            $table->dateTime('attempted_at')->index();
        });
    }
}
