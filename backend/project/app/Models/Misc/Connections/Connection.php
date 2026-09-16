<?php

namespace App\Models\Misc\Connections;

use App\Models\Concerns\HasMonthlyTable;
use App\Models\Concerns\SearchableLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A log of a single outbound external API call, written to a per-month table
 * (connections_YYYY_MM) on the logging connection and mirrored into the OpenSearch
 * `{prefix}connections` index for list/analytics reads.
 */
class Connection extends Model
{
    use HasMonthlyTable;
    use SearchableLog;

    /**
     * Bare OpenSearch index name (prefixed by SearchableLog::searchableAs()).
     */
    public const RESOURCE_KEY = 'connections';

    /**
     * Base name for the monthly partitioning (connections_YYYY_MM).
     */
    protected string $baseTable = 'connections';

    /**
     * These rows carry their own requested_at; no created_at/updated_at.
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'type', 'reference', 'method', 'url', 'headers', 'params', 'payload',
        'response', 'status_code', 'duration_ms', 'exception', 'ip_address',
        'user_type', 'user_id', 'requested_at',
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
     * Get the attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'headers' => 'array',
            'params' => 'array',
            'payload' => 'array',
            'response' => 'array',
            'duration_ms' => 'integer',
            'requested_at' => 'datetime',
        ];
    }

    /**
     * The OpenSearch document — the lean list/analytics fields only; the heavy
     * request/response blobs stay in MySQL. `month` + `id` key back to the row.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'month' => $this->scoutMonth(),
            'type' => $this->type,
            'reference' => $this->reference,
            'method' => $this->method,
            'url' => $this->url,
            'status_code' => $this->status_code,
            'duration_ms' => $this->duration_ms,
            'user_type' => $this->user_type,
            'user_id' => $this->user_id,
            'requested_at' => $this->requested_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * The minimal list shape for the admin connection-log viewer.
     *
     * @return array<string, mixed>
     */
    public function toListArray(): array
    {
        return [
            'id' => $this->getScoutKey(),
            'type' => $this->type,
            'reference' => $this->reference,
            'method' => $this->method,
            'url' => $this->url,
            'status_code' => $this->status_code,
            'duration_ms' => $this->duration_ms,
            'requested_at' => $this->requested_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * The OpenSearch field mapping for this log's index (mirrors the lean document).
     *
     * @return array<string, array<string, mixed>>
     */
    public static function searchableMapping(): array
    {
        return [
            'id' => ['type' => 'long'],
            'month' => ['type' => 'keyword'],
            'type' => ['type' => 'keyword'],
            'reference' => ['type' => 'keyword'],
            'method' => ['type' => 'keyword'],
            'url' => ['type' => 'text'],
            'status_code' => ['type' => 'keyword'],
            'duration_ms' => ['type' => 'integer'],
            'user_type' => ['type' => 'keyword'],
            'user_id' => ['type' => 'long'],
            'requested_at' => ['type' => 'date', 'format' => 'yyyy-MM-dd HH:mm:ss'],
        ];
    }

    /**
     * Build a month's connection table schema on the logging connection.
     */
    protected function createMonthlyTable(string $tableName): void
    {
        Schema::connection($this->getConnectionName())->create($tableName, function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('type', 64)->index();
            $table->string('reference', 191)->nullable()->index();
            $table->string('method', 10);
            $table->text('url');
            $table->mediumText('headers')->nullable();
            $table->mediumText('params')->nullable();
            $table->mediumText('payload')->nullable();
            $table->mediumText('response')->nullable();
            $table->string('status_code', 10)->nullable()->index();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->text('exception')->nullable();
            $table->ipAddress('ip_address')->nullable()->index();
            $table->string('user_type')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->dateTime('requested_at')->index();
        });
    }
}
