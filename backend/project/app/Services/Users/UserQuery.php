<?php

namespace App\Services\Users;

use App\Models\Users\User;
use App\Services\Security\PiiCrypter;
use Illuminate\Contracts\Pagination\LengthAwarePaginator as LengthAwarePaginatorContract;
use Illuminate\Pagination\LengthAwarePaginator;
use OpenSearch\Client;
use Throwable;

/**
 * Lists users for the admin view from OpenSearch: exact `term` filters, a
 * blind-index `search` (hashed server-side, exact match across the four hash
 * fields — plaintext never reaches the cluster), a whitelisted sort, then hydrates the hit ids
 * from MySQL in hit order. When reads are disabled (`opensearch.read.enabled`,
 * false in the test suite) or the cluster errors, the identical filters run on
 * MySQL via the existing `Filterable` path.
 */
class UserQuery
{
    /**
     * Columns allowed for `order_by` (mirrors User::SORTABLE).
     */
    protected const SORTABLE = ['id', 'created_at', 'updated_at'];

    /**
     * Exact-match filters (mirrors User::FILTERABLE); flags are int-typed in the index.
     */
    protected const TERMS = ['status', 'is_active'];

    /**
     * The int-typed flag columns among TERMS.
     */
    protected const FLAGS = ['is_active'];

    /**
     * The blind-index hash fields `search` matches against.
     */
    protected const HASHED = ['first_name_hash', 'last_name_hash', 'email_hash', 'mobile_number_hash'];

    /**
     * Create the service.
     */
    public function __construct(private Client $client, private PiiCrypter $crypter) {}

    /**
     * The admin list: OpenSearch first, MySQL on a disabled flag or any error.
     *
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginatorContract<int, User>
     */
    public function forAdmin(array $filters): LengthAwarePaginatorContract
    {
        if (config('opensearch.read.enabled', true)) {
            try {
                return $this->search($filters);
            } catch (Throwable $e) {
                report($e);
            }
        }

        return User::list($filters, User::with(['photo']));
    }

    /**
     * Run the OpenSearch query and hydrate the hit ids from MySQL in hit order.
     *
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginatorContract<int, User>
     */
    protected function search(array $filters): LengthAwarePaginatorContract
    {
        $perPage = min(max((int) ($filters['per_page'] ?? 20), 1), 100);
        $page = max((int) ($filters['page'] ?? 1), 1);

        $response = $this->client->search([
            'index' => (new User)->searchableAs(),
            'body' => [
                'track_total_hits' => true,
                'from' => ($page - 1) * $perPage,
                'size' => $perPage,
                '_source' => false,
                'query' => $this->dsl($filters),
                'sort' => $this->sort($filters),
            ],
        ]);

        $ids = array_map(fn (array $hit) => (int) $hit['_id'], $response['hits']['hits'] ?? []);
        $total = (int) ($response['hits']['total']['value'] ?? 0);

        $users = $ids
            ? User::query()->whereIn('id', $ids)->with('photo')->get()->sortBy(fn (User $u) => array_search($u->id, $ids, true))->values()
            : collect();

        return new LengthAwarePaginator($users, $total, $perPage, $page, [
            'path' => LengthAwarePaginator::resolveCurrentPath(),
            'query' => request()->query(),
        ]);
    }

    /**
     * The query DSL: exact terms plus the hashed `search` (an OR across the four
     * blind indexes — the plaintext is hashed here and never sent anywhere).
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function dsl(array $filters): array
    {
        $filter = [];

        foreach (self::TERMS as $field) {
            $value = $filters[$field] ?? null;

            if ($value !== null && $value !== '') {
                $filter[] = ['term' => [$field => in_array($field, self::FLAGS, true) ? (int) $value : $value]];
            }
        }

        if (! empty($filters['search'])) {
            $hash = $this->crypter->hash((string) $filters['search']);

            $filter[] = ['bool' => [
                'should' => array_map(fn (string $field) => ['term' => [$field => $hash]], self::HASHED),
                'minimum_should_match' => 1,
            ]];
        }

        return $filter ? ['bool' => ['filter' => $filter]] : ['match_all' => (object) []];
    }

    /**
     * The whitelisted sort (default `id desc`), with an id tiebreak.
     *
     * @param  array<string, mixed>  $filters
     * @return list<array<string, array<string, string>>>
     */
    protected function sort(array $filters): array
    {
        $orderBy = in_array($filters['order_by'] ?? null, self::SORTABLE, true) ? $filters['order_by'] : 'id';
        $order = strtolower((string) ($filters['sort_by'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';

        $sort = [[$orderBy => ['order' => $order]]];

        if ($orderBy !== 'id') {
            $sort[] = ['id' => ['order' => $order]];
        }

        return $sort;
    }
}
