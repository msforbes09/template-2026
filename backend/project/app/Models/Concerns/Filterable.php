<?php

namespace App\Models\Concerns;

use App\Services\Security\PiiCrypter;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Adds a reusable paginated listing with filtering to a model.
 *
 * The using model declares its whitelists via constants (all optional):
 * - `SORTABLE`   — columns allowed for `order_by` (defaults to `id`)
 * - `SEARCHABLE` — columns the fuzzy `search` filter scans
 * - `FILTERABLE` — columns allowed for exact-match filtering
 *
 * The generic `filter` scope below covers the common case; a model may
 * override it for custom filtering.
 */
trait Filterable
{
    /**
     * Paginate records applying the model's filter scope, ordering, and page size.
     *
     * Recognised control keys: `order_by`, `sort_by` (asc|desc), `per_page`.
     * All other keys are passed to the `filter` scope.
     *
     * An optional base query lets a caller pre-scope the results (e.g. active only).
     *
     * @param  array<string, mixed>  $filters
     * @param  Builder<static>|null  $query
     * @return LengthAwarePaginator<int, static>
     */
    public static function list(array $filters = [], ?Builder $query = null): LengthAwarePaginator
    {
        $sortable = static::sortableColumns();

        $orderBy = in_array($filters['order_by'] ?? null, $sortable, true)
            ? $filters['order_by']
            : ($sortable[0] ?? 'id');

        $sortBy = strtolower((string) ($filters['sort_by'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';
        $perPage = min(max((int) ($filters['per_page'] ?? 20), 1), 100);

        return ($query ?? static::query())
            ->filter($filters)
            ->orderBy($orderBy, $sortBy)
            ->paginate($perPage);
    }

    /**
     * Apply exact-match column filters and a fuzzy search to the query.
     *
     * @param  array<string, mixed>  $filters
     */
    public function scopeFilter(Builder $query, array $filters = []): Builder
    {
        $hashed = static::hashedColumns();

        foreach (static::filterableColumns() as $column) {
            // is_scalar guard: an array value (e.g. ?is_active[]=0) would cast to a
            // surprising truthy int and invert the filter — ignore non-scalars (T3b).
            if (array_key_exists($column, $filters) && is_scalar($filters[$column]) && $filters[$column] !== '') {
                in_array($column, $hashed, true)
                    ? $query->where("{$column}_hash", app(PiiCrypter::class)->hash((string) $filters[$column]))
                    : $query->where($column, $filters[$column]);
            }
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            // Blind-indexed columns can only be matched exactly (on their hash);
            // the rest keep the fuzzy LIKE.
            $hashedSearch = $hashed ? app(PiiCrypter::class)->hash((string) $search) : null;

            $query->where(function (Builder $query) use ($search, $hashed, $hashedSearch) {
                foreach (static::searchableColumns() as $index => $column) {
                    [$col, $operator, $value] = in_array($column, $hashed, true)
                        ? ["{$column}_hash", '=', $hashedSearch]
                        : [$column, 'like', "%{$search}%"];

                    $index === 0
                        ? $query->where($col, $operator, $value)
                        : $query->orWhere($col, $operator, $value);
                }
            });
        }

        return $query;
    }

    /**
     * Columns allowed for ordering (defaults to `id`).
     *
     * @return list<string>
     */
    protected static function sortableColumns(): array
    {
        return defined(static::class.'::SORTABLE') ? static::SORTABLE : ['id'];
    }

    /**
     * Columns allowed for exact-match filtering.
     *
     * @return list<string>
     */
    protected static function filterableColumns(): array
    {
        return defined(static::class.'::FILTERABLE') ? static::FILTERABLE : [];
    }

    /**
     * Columns scanned by the fuzzy `search` filter.
     *
     * @return list<string>
     */
    protected static function searchableColumns(): array
    {
        return defined(static::class.'::SEARCHABLE') ? static::SEARCHABLE : [];
    }

    /**
     * Blind-indexed (encrypted) columns — matched exactly on `{column}_hash`
     * instead of with LIKE/`=`. Empty for models without encrypted PII.
     *
     * @return list<string>
     */
    protected static function hashedColumns(): array
    {
        return defined(static::class.'::HASHED_PII') ? static::HASHED_PII : [];
    }
}
