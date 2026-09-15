<?php

namespace Tests\Feature\Users;

use App\Models\Users\User;
use App\Services\Security\PiiCrypter;
use App\Services\Users\UserQuery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use OpenSearch\Client;
use RuntimeException;
use Tests\TestCase;

/**
 * UserQuery's OpenSearch path: the admin-list DSL (terms, hashed search, sort
 * whitelist with missing:_last on approved_at), id-ordered hydration from MySQL,
 * and the MySQL fallback when the cluster fails or reads are disabled.
 */
class UserQueryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A mock client capturing the search params and returning the given hit ids.
     *
     * @param  list<int>  $ids
     */
    private function capturingClient(?array &$captured, array $ids): Client
    {
        $client = Mockery::mock(Client::class);
        $client->shouldReceive('search')->andReturnUsing(function (array $params) use (&$captured, $ids) {
            $captured = $params;

            return ['hits' => ['total' => ['value' => count($ids)], 'hits' => array_map(fn (int $id) => ['_id' => (string) $id], $ids)]];
        });

        return $client;
    }

    /**
     * Build the service around a client mock.
     */
    private function makeQuery(Client $client): UserQuery
    {
        return new UserQuery($client, app(PiiCrypter::class));
    }

    /**
     * Terms filter exactly, `search` matches the hash across the four blind
     * indexes, and hits hydrate from MySQL in hit order.
     */
    public function test_terms_hashed_search_and_hydration(): void
    {
        config(['opensearch.read.enabled' => true]);
        [$a, $b] = [User::factory()->create(), User::factory()->create()];
        $captured = null;

        $paginator = $this->makeQuery($this->capturingClient($captured, [$b->id, $a->id]))
            ->forAdmin(['status' => 'approved', 'is_active' => '1', 'search' => 'user@example.com', 'per_page' => 10, 'page' => 2]);

        $this->assertSame('template_users', $captured['index']);
        $this->assertFalse($captured['body']['_source']);
        $this->assertSame(10, $captured['body']['from']);
        $this->assertSame(10, $captured['body']['size']);

        $filter = $captured['body']['query']['bool']['filter'];
        $this->assertContains(['term' => ['status' => 'approved']], $filter);
        $this->assertContains(['term' => ['is_active' => 1]], $filter);

        $hash = app(PiiCrypter::class)->hash('user@example.com');
        $should = end($filter)['bool'];
        $this->assertSame(1, $should['minimum_should_match']);
        $this->assertContains(['term' => ['email_hash' => $hash]], $should['should']);
        $this->assertContains(['term' => ['first_name_hash' => $hash]], $should['should']);
        $this->assertContains(['term' => ['last_name_hash' => $hash]], $should['should']);
        $this->assertContains(['term' => ['mobile_number_hash' => $hash]], $should['should']);

        $this->assertSame([$b->id, $a->id], $paginator->getCollection()->pluck('id')->all());
        $this->assertSame(2, $paginator->total());
    }

    /**
     * The sort whitelist: approved_at sorts with missing:_last + an id tiebreak;
     * an unknown order_by falls back to id; direction defaults to desc.
     */
    public function test_sort_whitelist_and_tiebreak(): void
    {
        config(['opensearch.read.enabled' => true]);
        $captured = null;
        $query = $this->makeQuery($this->capturingClient($captured, []));

        $query->forAdmin(['order_by' => 'updated_at', 'sort_by' => 'asc']);
        $this->assertSame(['order' => 'asc'], $captured['body']['sort'][0]['updated_at']);
        $this->assertSame(['order' => 'asc'], $captured['body']['sort'][1]['id']);

        $query->forAdmin(['order_by' => 'drop table', 'sort_by' => 'sideways']);
        $this->assertSame([['id' => ['order' => 'desc']]], $captured['body']['sort']);

        $query->forAdmin(['order_by' => 'created_at']);
        $this->assertSame(['order' => 'desc'], $captured['body']['sort'][0]['created_at']);
    }

    /**
     * No filters → match_all; blank/null filter values are skipped.
     */
    public function test_empty_filters_match_all(): void
    {
        config(['opensearch.read.enabled' => true]);
        $captured = null;

        $this->makeQuery($this->capturingClient($captured, []))->forAdmin(['status' => '', 'search' => null]);

        $this->assertArrayHasKey('match_all', $captured['body']['query']);
    }

    /**
     * A cluster error falls back to the MySQL Filterable path (same filters).
     */
    public function test_falls_back_to_mysql_on_error(): void
    {
        config(['opensearch.read.enabled' => true]);
        User::factory()->create(['status' => 'draft']);
        $approved = User::factory()->create();
        $approved->update(['status' => 'approved']);

        $client = Mockery::mock(Client::class);
        $client->shouldReceive('search')->andThrow(new RuntimeException('cluster down'));

        $paginator = $this->makeQuery($client)->forAdmin(['status' => 'approved']);

        $this->assertSame([$approved->id], $paginator->getCollection()->pluck('id')->all());
    }

    /**
     * Reads disabled (the suite default) → straight to MySQL, no client call.
     */
    public function test_reads_disabled_uses_mysql(): void
    {
        config(['opensearch.read.enabled' => false]);
        $user = User::factory()->create();

        $client = Mockery::mock(Client::class);
        $client->shouldNotReceive('search');

        $paginator = $this->makeQuery($client)->forAdmin([]);

        $this->assertSame([$user->id], $paginator->getCollection()->pluck('id')->all());
    }
}
