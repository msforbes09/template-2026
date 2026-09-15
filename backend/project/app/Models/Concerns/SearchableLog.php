<?php

namespace App\Models\Concerns;

use Illuminate\Support\Carbon;
use OpenSearch\ScoutDriverPlus\Searchable;

/**
 * Makes a monthly log model searchable in OpenSearch (dual-write alongside its
 * monthly MySQL table). Shared by every log model so the index name, the
 * month-scoped document id, and the search wiring stay identical.
 *
 * The using model must define a `RESOURCE_KEY` constant (the bare index name) and a
 * `toSearchableArray()` returning its lean document. Models whose primary timestamp
 * is not `requested_at` override `scoutDate()`.
 */
trait SearchableLog
{
    use Searchable;

    /**
     * The physical index name: the shared prefix + this model's resource key. The
     * prefix is the single source of truth also used by the index migrations, so
     * the names can never drift.
     */
    public function searchableAs(): string
    {
        return config('opensearch.migrations.prefixes.index').static::RESOURCE_KEY;
    }

    /**
     * The OpenSearch document id, scoped by month ("{Y_m}:{id}"). Monthly-table ids
     * are only unique within their month; a bare id would collide across months in
     * the single per-model index and silently overwrite documents.
     */
    public function getScoutKey(): string
    {
        return $this->scoutMonth().':'.$this->getKey();
    }

    /**
     * The `Y_m` bucket this record belongs to (its month partition).
     */
    public function scoutMonth(): string
    {
        return $this->scoutDate()->format('Y_m');
    }

    /**
     * The timestamp column that determines the record's month and drives list
     * range/sort queries. Defaults to `requested_at`; models with a different
     * primary timestamp override this.
     */
    public function scoutDateColumn(): string
    {
        return 'requested_at';
    }

    /**
     * The timestamp value that determines the record's month.
     */
    protected function scoutDate(): Carbon
    {
        return $this->{$this->scoutDateColumn()} ?? $this->freshTimestamp();
    }
}
