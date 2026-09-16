<?php

namespace App\Models\Concerns;

use Closure;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Routes a model's reads/writes to a per-month, base-first table (e.g. audits_2026_07),
 * creating that month's table on demand.
 */
trait HasMonthlyTable
{
    /**
     * The table for the current month.
     */
    public function getTable(): string
    {
        return $this->getTableForMonth(now());
    }

    /**
     * The table name for a given month.
     */
    public function getTableForMonth(Carbon|string $date): string
    {
        $date = is_string($date) ? Carbon::parse($date) : $date;

        return $this->baseTable.'_'.$date->format('Y_m');
    }

    /**
     * Create the month's table if it does not yet exist (race-safe).
     */
    public function createMonthlyTableIfNotExists(Carbon|string|null $date = null): bool
    {
        $name = $this->getTableForMonth($date ?? now());

        if (Schema::connection($this->getConnectionName())->hasTable($name)) {
            return false;
        }

        try {
            $this->createMonthlyTable($name);

            return true;
        } catch (\Throwable $e) {
            Log::warning("Monthly table {$name} create skipped: {$e->getMessage()}");

            return false;
        }
    }

    /**
     * Build the month's table schema. Implemented by the using model.
     */
    abstract protected function createMonthlyTable(string $tableName): void;

    /**
     * Ensure the month's table exists before saving.
     */
    public function save(array $options = []): bool
    {
        $this->createMonthlyTableIfNotExists();

        return parent::save($options);
    }

    /**
     * Scope a query to a specific month's table.
     */
    public function scopeForMonth(Builder $query, Carbon|string $date): Builder
    {
        return $query->from($this->getTableForMonth($date));
    }

    /**
     * Paginate one month's rows (newest id first), applying an optional
     * table-specific filter closure. A month whose table does not exist yields an
     * empty page. Reusable across every monthly log table (gateway, connections, …).
     *
     * @param  string|null  $month  A `YYYY-MM` value, or null for the current month.
     * @param  Closure(Builder): mixed|null  $constrain  Extra query constraints.
     */
    public static function paginateForMonth(?string $month, int $perPage, ?Closure $constrain = null): LengthAwarePaginator
    {
        $model = new static;
        $table = $month ? $model->getTableForMonth($month) : $model->getTable();

        if (! Schema::connection($model->getConnectionName())->hasTable($table)) {
            return new Paginator([], 0, $perPage, Paginator::resolveCurrentPage());
        }

        $query = static::query()->from($table)->orderByDesc('id');

        if ($constrain) {
            $constrain($query);
        }

        return $query->paginate($perPage);
    }

    /**
     * Find a single row by a list reference, or throw. The reference is either the
     * self-describing scout key `"{Y_m}:{id}"` (as returned in list `id` fields) —
     * whose month prefix locates the table — or a bare `id`, which resolves against
     * the current month.
     */
    public static function findByReferenceOrFail(int|string $reference): static
    {
        if (is_string($reference) && str_contains($reference, ':')) {
            [$month, $id] = explode(':', $reference, 2);

            return static::findForMonthOrFail($id, str_replace('_', '-', $month));
        }

        return static::findForMonthOrFail($reference, null);
    }

    /**
     * Find a single row by id within a month's table, or throw. A `YYYY-MM` month,
     * or null for the current month.
     */
    public static function findForMonthOrFail(int|string $id, ?string $month): static
    {
        $model = new static;
        $table = $month ? $model->getTableForMonth($month) : $model->getTable();

        // Use an unqualified key column: find()/whereKey() would qualify with the
        // model's current-month table (getTable()), which breaks when $table is a
        // different month (e.g. "select from …_07 where …_08.id = ?").
        $row = Schema::connection($model->getConnectionName())->hasTable($table)
            ? static::query()->from($table)->where($model->getKeyName(), $id)->first()
            : null;

        if ($row === null) {
            throw (new ModelNotFoundException)->setModel(static::class, [$id]);
        }

        return $row;
    }
}
