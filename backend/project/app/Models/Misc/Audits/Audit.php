<?php

namespace App\Models\Misc\Audits;

use App\Models\Concerns\HasMonthlyTable;
use App\Models\Concerns\SearchableLog;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use OwenIt\Auditing\Models\Audit as BaseAudit;

/**
 * Audit record written to a per-month table on the logging connection and mirrored
 * into the OpenSearch `{prefix}audits` index for list/analytics reads.
 */
class Audit extends BaseAudit
{
    use HasMonthlyTable;
    use SearchableLog;

    /**
     * Bare OpenSearch index name (prefixed by SearchableLog::searchableAs()).
     */
    public const RESOURCE_KEY = 'audits';

    /**
     * Base name for the monthly partitioning (audits_YYYY_MM).
     */
    protected string $baseTable = 'audits';

    /**
     * The OpenSearch document — the lean audit dimensions only; the heavy
     * old/new value blobs stay in MySQL. `month` + `id` key back to the row.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'month' => $this->scoutMonth(),
            'user_type' => $this->user_type,
            'user_id' => $this->user_id,
            'event' => $this->event,
            'auditable_type' => $this->auditable_type,
            'auditable_id' => $this->auditable_id,
            'tags' => $this->tags,
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * This log's month partition + list range/sort are keyed on `created_at`.
     */
    public function scoutDateColumn(): string
    {
        return 'created_at';
    }

    /**
     * The minimal list shape for the admin audit viewer (the heavy old/new value
     * blobs are not surfaced here).
     *
     * @return array<string, mixed>
     */
    public function toListArray(): array
    {
        return [
            'id' => $this->getScoutKey(),
            'event' => $this->event,
            'auditable_type' => $this->auditable_type,
            'auditable_id' => $this->auditable_id,
            'user_type' => $this->user_type,
            'user_id' => $this->user_id,
            'tags' => $this->tags,
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * The OpenSearch field mapping for this log's index (mirrors the lean document;
     * the heavy old/new value blobs are not indexed).
     *
     * @return array<string, array<string, mixed>>
     */
    public static function searchableMapping(): array
    {
        return [
            'id' => ['type' => 'long'],
            'month' => ['type' => 'keyword'],
            'user_type' => ['type' => 'keyword'],
            'user_id' => ['type' => 'long'],
            'event' => ['type' => 'keyword'],
            'auditable_type' => ['type' => 'keyword'],
            'auditable_id' => ['type' => 'keyword'],
            'tags' => ['type' => 'keyword'],
            'created_at' => ['type' => 'date', 'format' => 'yyyy-MM-dd HH:mm:ss'],
        ];
    }

    /**
     * Build a month's audit table schema on the audit connection.
     */
    protected function createMonthlyTable(string $tableName): void
    {
        Schema::connection($this->getConnectionName())->create($tableName, function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('user_type')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('event')->index();
            $table->string('auditable_type')->nullable()->index();
            $table->string('auditable_id')->nullable()->index();
            $table->mediumText('old_values')->nullable();
            $table->mediumText('new_values')->nullable();
            $table->text('url')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent', 1023)->nullable();
            $table->string('tags')->nullable();
            $table->dateTime('created_at')->nullable()->index();
            $table->dateTime('updated_at')->nullable()->index();
        });
    }
}
