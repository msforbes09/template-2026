<?php

namespace App\Services\OpenSearch;

use App\Models\Misc\Audits\Audit;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Misc\Connections\Connection;
use OpenSearch\Client;
use Throwable;

/**
 * Sets up the ISM (Index State Management) lifecycle for the log indices: a single
 * shared policy that rolls each index over (by age or size) and deletes backing
 * indices past the retention window — OpenSearch manages purging, no Laravel
 * scheduler. Each managed index is a write alias over rollover indices, so Scout's
 * static searchableAs() keeps working unchanged.
 *
 * plan() is the pure, desired-state description (policy + per-type index template +
 * write-alias bootstrap); apply() reconciles it against the cluster idempotently.
 */
class LogLifecycle
{
    /**
     * The searchable log models whose indices this lifecycle manages.
     *
     * @var list<class-string>
     */
    private const MODELS = [Connection::class, AuthAttempt::class, Audit::class];

    /**
     * @param  Client  $client  The OpenSearch client (bound from the default connection).
     */
    public function __construct(private Client $client) {}

    /**
     * The desired lifecycle operations, in dependency order: the ISM policy first
     * (its ism_template auto-attaches to new indices), then each type's index
     * template, then its write-alias bootstrap index.
     *
     * @return list<array<string, mixed>>
     */
    public function plan(): array
    {
        $ops = [[
            'kind' => 'policy',
            'method' => 'PUT',
            'uri' => '/_plugins/_ism/policies/'.$this->policyId(),
            'body' => $this->policyBody(),
        ]];

        foreach (self::MODELS as $model) {
            $alias = (new $model)->searchableAs();

            $ops[] = [
                'kind' => 'template',
                'method' => 'PUT',
                'uri' => '/_index_template/'.$alias,
                'body' => $this->templateBody($alias, $model::searchableMapping()),
            ];

            $ops[] = [
                'kind' => 'bootstrap',
                'method' => 'PUT',
                'uri' => '/'.$alias.'-000001',
                'alias' => $alias,
                'body' => ['aliases' => [$alias => ['is_write_index' => true]]],
            ];
        }

        return $ops;
    }

    /**
     * Reconcile the plan against the cluster: (re)PUT the templates (idempotent),
     * and create the policy / bootstrap indices only when absent. Never destructive.
     *
     * @return list<array<string, string>> Per-op outcome (applied|skipped|error).
     */
    public function apply(): array
    {
        $results = [];

        foreach ($this->plan() as $op) {
            $skip = ($op['kind'] === 'policy' && $this->exists('/_plugins/_ism/policies/'.$this->policyId()))
                || ($op['kind'] === 'bootstrap' && $this->exists('/_alias/'.$op['alias']));

            if ($skip) {
                $results[] = ['uri' => $op['uri'], 'status' => 'skipped'];

                continue;
            }

            try {
                $this->client->request($op['method'], $op['uri'], ['body' => $op['body']]);
                $results[] = ['uri' => $op['uri'], 'status' => 'applied'];
            } catch (Throwable $e) {
                $results[] = ['uri' => $op['uri'], 'status' => 'error', 'message' => $e->getMessage()];
            }
        }

        return $results;
    }

    /**
     * The shared ISM policy id.
     */
    public function policyId(): string
    {
        return (string) config('opensearch.lifecycle.policy_id', 'template_logs_policy');
    }

    /**
     * The ISM policy body: roll the write index over by age/size, then delete
     * backing indices once they pass the retention window. The ism_template
     * auto-applies the policy to every managed index pattern.
     *
     * @return array<string, mixed>
     */
    private function policyBody(): array
    {
        return [
            'policy' => [
                'description' => 'Rollover log indices; delete backing indices past the retention window.',
                'default_state' => 'hot',
                'states' => [
                    [
                        'name' => 'hot',
                        'actions' => [[
                            'rollover' => [
                                'min_index_age' => (string) config('opensearch.lifecycle.rollover_age', '30d'),
                                'min_primary_shard_size' => (string) config('opensearch.lifecycle.rollover_size', '25gb'),
                            ],
                        ]],
                        'transitions' => [[
                            'state_name' => 'delete',
                            'conditions' => ['min_index_age' => $this->retentionDays().'d'],
                        ]],
                    ],
                    [
                        'name' => 'delete',
                        // (object) [] so the empty action encodes as {} not [].
                        'actions' => [['delete' => (object) []]],
                        'transitions' => [],
                    ],
                ],
                'ism_template' => [[
                    'index_patterns' => array_map(fn (string $model) => (new $model)->searchableAs().'-*', self::MODELS),
                    'priority' => 100,
                ]],
            ],
        ];
    }

    /**
     * The index template for a managed type: bind the rollover alias + the field
     * mappings so every rollover index inherits them.
     *
     * @param  array<string, array<string, mixed>>  $mappings
     * @return array<string, mixed>
     */
    private function templateBody(string $alias, array $mappings): array
    {
        return [
            'index_patterns' => [$alias.'-*'],
            'template' => [
                'settings' => [
                    'index.plugins.index_state_management.rollover_alias' => $alias,
                    'number_of_shards' => (int) config('opensearch.lifecycle.number_of_shards', 1),
                    'number_of_replicas' => (int) config('opensearch.lifecycle.number_of_replicas', 1),
                ],
                'mappings' => ['properties' => $mappings],
            ],
        ];
    }

    /**
     * The retention window in days (ISM has no month unit): months * 365 / 12, so
     * 12 months resolves to exactly 365 days.
     */
    private function retentionDays(): int
    {
        $months = (int) config('opensearch.lifecycle.retention_months', 12);

        return (int) round($months * 365 / 12);
    }

    /**
     * Whether a GET on the given URI succeeds (resource exists). Any failure — a
     * 404 or an unreachable cluster — is treated as "not present".
     */
    private function exists(string $uri): bool
    {
        try {
            $this->client->request('GET', $uri);

            return true;
        } catch (Throwable) {
            return false;
        }
    }
}
