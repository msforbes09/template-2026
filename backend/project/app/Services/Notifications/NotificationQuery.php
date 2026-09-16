<?php

namespace App\Services\Notifications;

use App\Models\Notifications\Notification;
use App\Models\Users\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator as LengthAwarePaginatorContract;
use Illuminate\Pagination\LengthAwarePaginator;
use OpenSearch\Client;
use Throwable;

/**
 * The user's own notification list: filter + sort + paginate on OpenSearch
 * (own-scoped `notifiable` terms — the index is a pure accelerator, never the
 * sole scope: hydration re-applies ownership), hydrating rows from MySQL in
 * hit order. When reads are disabled (`opensearch.read.enabled`, false in the
 * test suite) or the cluster errors, the same filters run on MySQL.
 *
 * Filters: `unread` (truthy → unread only), `type` (exact).
 */
class NotificationQuery
{
    /**
     * Create the service.
     */
    public function __construct(private Client $client) {}

    /**
     * The caller's notifications, newest first.
     *
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginatorContract<int, Notification>
     */
    public function forUser(User $user, array $filters, int $perPage, int $page): LengthAwarePaginatorContract
    {
        if (config('opensearch.read.enabled', true)) {
            try {
                return $this->search($user, $filters, $perPage, $page);
            } catch (Throwable) {
                return $this->fallback($user, $filters, $perPage, $page);
            }
        }

        return $this->fallback($user, $filters, $perPage, $page);
    }

    /**
     * The OpenSearch path: own-scoped bool filter, id-desc sort, MySQL hydration.
     *
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginatorContract<int, Notification>
     */
    protected function search(User $user, array $filters, int $perPage, int $page): LengthAwarePaginatorContract
    {
        $must = [
            ['term' => ['notifiable_type' => $user->getMorphClass()]],
            ['term' => ['notifiable_id' => $user->getKey()]],
        ];

        if (! empty($filters['unread'])) {
            $must[] = ['term' => ['is_read' => 0]];
        }

        if (! empty($filters['type'])) {
            $must[] = ['term' => ['type' => (string) $filters['type']]];
        }

        $response = $this->client->search([
            'index' => (new Notification)->searchableAs(),
            'body' => [
                'query' => ['bool' => ['filter' => $must]],
                'sort' => [['id' => 'desc']],
                'from' => ($page - 1) * $perPage,
                'size' => $perPage,
                '_source' => false,
                'track_total_hits' => true,
            ],
        ]);

        $ids = array_map(fn (array $hit) => (int) $hit['_id'], $response['hits']['hits'] ?? []);
        $total = (int) ($response['hits']['total']['value'] ?? 0);

        // Hydrate in hit order, ownership re-applied (the index only accelerates).
        $rows = Notification::query()
            ->where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->getKey())
            ->whereIn('id', $ids)
            ->get()
            ->sortBy(fn (Notification $row) => array_search($row->id, $ids))
            ->values();

        return new LengthAwarePaginator($rows, $total, $perPage, $page);
    }

    /**
     * The MySQL path — identical filter semantics on the own-scoped relation.
     *
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginatorContract<int, Notification>
     */
    protected function fallback(User $user, array $filters, int $perPage, int $page): LengthAwarePaginatorContract
    {
        $query = $user->notifications();

        if (! empty($filters['unread'])) {
            $query->whereNull('read_at');
        }

        if (! empty($filters['type'])) {
            $query->where('type', (string) $filters['type']);
        }

        return $query->paginate($perPage, ['*'], 'page', $page);
    }
}
