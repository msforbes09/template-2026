<?php

namespace App\Services\Logs;

use Illuminate\Contracts\Pagination\LengthAwarePaginator as LengthAwarePaginatorContract;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use OpenSearch\Client;
use Throwable;

/**
 * Reads a searchable log's LIST from OpenSearch (querying its write alias, spanning
 * months, with exact-match term filters + a date range) and falls back transparently
 * to the MySQL monthly tables when OpenSearch is unavailable or the read path is
 * disabled. Log-type-agnostic — the model supplies its index (`searchableAs()`) and
 * date column (`scoutDateColumn()`). Detail (show) always reads MySQL.
 *
 * Filters: `['terms' => [field => value, …], 'from' => 'Y-m-d', 'to' => 'Y-m-d']` —
 * all optional.
 */
class LogQuery
{
    /**
     * @param  Client  $client  The OpenSearch client (bound from the default connection).
     */
    public function __construct(private Client $client) {}

    /**
     * List a log type's rows for the given filters, newest first.
     *
     * @param  class-string  $model  A SearchableLog + HasMonthlyTable model.
     * @param  array<string, mixed>  $filters
     */
    public function list(string $model, array $filters, int $perPage, int $page): LengthAwarePaginatorContract
    {
        if (config('opensearch.read.enabled', true)) {
            try {
                return $this->search($model, $filters, $perPage, $page);
            } catch (Throwable $e) {
                report($e);
            }
        }

        return $this->mysql($model, $filters, $perPage);
    }

    /**
     * Query the model's OpenSearch write alias and hydrate the lean hit sources back
     * into models so the list resource renders identically to the MySQL path.
     *
     * @param  class-string  $model
     * @param  array<string, mixed>  $filters
     */
    private function search(string $model, array $filters, int $perPage, int $page): LengthAwarePaginatorContract
    {
        $instance = new $model;
        $dateColumn = $instance->scoutDateColumn();

        $response = $this->client->search([
            'index' => $instance->searchableAs(),
            'body' => [
                'track_total_hits' => true,
                'from' => ($page - 1) * $perPage,
                'size' => $perPage,
                'query' => $this->query($filters, $dateColumn),
                'sort' => [[$dateColumn => ['order' => 'desc']], ['id' => ['order' => 'desc']]],
            ],
        ]);

        $hits = $response['hits']['hits'] ?? [];
        $total = (int) ($response['hits']['total']['value'] ?? 0);

        $models = array_map(fn (array $hit) => $instance->newFromBuilder($hit['_source'] ?? []), $hits);

        return new LengthAwarePaginator($models, $total, $perPage, $page, [
            'path' => LengthAwarePaginator::resolveCurrentPath(),
            'query' => request()->query(),
        ]);
    }

    /**
     * Build the OpenSearch bool/filter query from the term filters + date range.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function query(array $filters, string $dateColumn): array
    {
        $must = [];

        foreach (($filters['terms'] ?? []) as $field => $value) {
            if (! is_scalar($value) || $value === '') {
                continue;
            }

            // A status class like "5xx" filters the whole 500–599 range; anything
            // else is an exact-match term.
            if ($range = $this->statusClassRange($value)) {
                $must[] = ['range' => [$field => ['gte' => $range[0], 'lte' => $range[1]]]];
            } else {
                $must[] = ['term' => [$field => $value]];
            }
        }

        $range = [];
        if (! empty($filters['from'])) {
            $range['gte'] = $filters['from'].' 00:00:00';
        }
        if (! empty($filters['to'])) {
            $range['lte'] = $filters['to'].' 23:59:59';
        }

        if ($range) {
            $range['format'] = 'yyyy-MM-dd HH:mm:ss';
            $must[] = ['range' => [$dateColumn => $range]];
        }

        return $must ? ['bool' => ['filter' => $must]] : ['match_all' => (object) []];
    }

    /**
     * Expand an HTTP status class ("1xx".."5xx", case-insensitive) into an inclusive
     * ["N00", "N99"] string range, so `status_code=5xx` matches 500–599. Returns null
     * for anything else (exact codes, non-status filters). String bounds compare
     * correctly because every stored code is a 3-character string.
     *
     * @return array{0: string, 1: string}|null
     */
    private function statusClassRange(mixed $value): ?array
    {
        if (is_string($value) && preg_match('/^([1-5])xx$/i', $value, $m)) {
            return [$m[1].'00', $m[1].'99'];
        }

        return null;
    }

    /**
     * MySQL fallback — the current month's monthly table with the same filters
     * (from/to applied within that month; a degraded fallback — OpenSearch spans
     * months).
     *
     * @param  class-string  $model
     * @param  array<string, mixed>  $filters
     */
    private function mysql(string $model, array $filters, int $perPage): LengthAwarePaginatorContract
    {
        $dateColumn = (new $model)->scoutDateColumn();

        return $model::paginateForMonth(
            null,
            $perPage,
            function (Builder $query) use ($filters, $dateColumn) {
                foreach (($filters['terms'] ?? []) as $field => $value) {
                    if (! is_scalar($value) || $value === '') {
                        continue;
                    }

                    if ($range = $this->statusClassRange($value)) {
                        $query->whereBetween($field, $range);
                    } else {
                        $query->where($field, $value);
                    }
                }

                $query
                    ->when(! empty($filters['from']), fn (Builder $q) => $q->where($dateColumn, '>=', $filters['from'].' 00:00:00'))
                    ->when(! empty($filters['to']), fn (Builder $q) => $q->where($dateColumn, '<=', $filters['to'].' 23:59:59'));
            },
        );
    }
}
