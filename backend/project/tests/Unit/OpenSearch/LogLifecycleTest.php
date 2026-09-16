<?php

namespace Tests\Unit\OpenSearch;

use App\Services\OpenSearch\LogLifecycle;
use Mockery;
use OpenSearch\Client;
use Tests\TestCase;

/**
 * Verifies the OpenSearch log-lifecycle plan (ISM policy + per-type index templates
 * + write-alias bootstrap) and that apply() reconciles it idempotently.
 */
class LogLifecycleTest extends TestCase
{
    /**
     * The four managed log aliases (prefix from config + each model's resource key).
     */
    private function aliases(): array
    {
        $prefix = config('opensearch.migrations.prefixes.index');

        return array_map(fn (string $k) => $prefix.$k, ['connections', 'auth_attempts', 'audits']);
    }

    /**
     * Find the single op of a kind (or all of that kind) in the plan.
     */
    private function ops(array $plan, string $kind): array
    {
        return array_values(array_filter($plan, fn ($op) => $op['kind'] === $kind));
    }

    /**
     * The plan's policy rolls over by age/size and deletes at the retention window,
     * and auto-attaches to every managed index pattern.
     */
    public function test_plan_policy_rolls_over_and_deletes_at_retention(): void
    {
        config(['opensearch.lifecycle.retention_months' => 12]);

        $plan = (new LogLifecycle(Mockery::mock(Client::class)))->plan();

        $policy = $this->ops($plan, 'policy')[0];
        $this->assertSame('PUT', $policy['method']);
        $this->assertSame('/_plugins/_ism/policies/template_logs_policy', $policy['uri']);

        $states = collect($policy['body']['policy']['states'])->keyBy('name');
        // 12 months -> 365 days.
        $this->assertSame('365d', $states['hot']['transitions'][0]['conditions']['min_index_age']);
        $this->assertSame('delete', $states['hot']['transitions'][0]['state_name']);
        $rollover = $states['hot']['actions'][0]['rollover'];
        $this->assertSame('30d', $rollover['min_index_age']);
        $this->assertSame('25gb', $rollover['min_primary_shard_size']);

        $patterns = $policy['body']['policy']['ism_template'][0]['index_patterns'];
        foreach ($this->aliases() as $alias) {
            $this->assertContains($alias.'-*', $patterns);
        }
    }

    /**
     * The plan creates a template per type (rollover alias + mappings) and a
     * bootstrap op for the first backing index with the write alias.
     */
    public function test_plan_has_template_and_bootstrap_per_type(): void
    {
        $plan = (new LogLifecycle(Mockery::mock(Client::class)))->plan();

        $this->assertCount(3, $this->ops($plan, 'template'));
        $this->assertCount(3, $this->ops($plan, 'bootstrap'));

        $gwAlias = config('opensearch.migrations.prefixes.index').'connections';

        $template = collect($this->ops($plan, 'template'))->firstWhere('uri', '/_index_template/'.$gwAlias);
        $this->assertSame([$gwAlias.'-*'], $template['body']['index_patterns']);
        $this->assertSame($gwAlias, $template['body']['template']['settings']['index.plugins.index_state_management.rollover_alias']);
        $this->assertSame(
            ['type' => 'date', 'format' => 'yyyy-MM-dd HH:mm:ss'],
            $template['body']['template']['mappings']['properties']['requested_at'],
        );

        $bootstrap = collect($this->ops($plan, 'bootstrap'))->firstWhere('uri', '/'.$gwAlias.'-000001');
        $this->assertTrue($bootstrap['body']['aliases'][$gwAlias]['is_write_index']);
    }

    /**
     * On a fresh cluster apply() PUTs everything: 1 policy + 3 templates + 3 bootstraps.
     */
    public function test_apply_creates_all_on_fresh_cluster(): void
    {
        $client = Mockery::mock(Client::class);
        // Existence checks (GET, 2 args) fail -> nothing exists yet.
        $client->allows('request')->with('GET', Mockery::any())->andThrow(new \RuntimeException('not found'));
        $client->allows('request')->with('PUT', Mockery::any(), Mockery::any())->andReturn([]);

        (new LogLifecycle($client))->apply();

        $client->shouldHaveReceived('request')->with('PUT', Mockery::any(), Mockery::any())->times(7);
        $client->shouldHaveReceived('request')->with('PUT', '/_plugins/_ism/policies/template_logs_policy', Mockery::any())->once();
    }

    /**
     * When the policy and aliases already exist, apply() re-PUTs only the templates
     * (idempotent), never recreating the policy or the bootstrap indices.
     */
    public function test_apply_is_idempotent_when_already_present(): void
    {
        $client = Mockery::mock(Client::class);
        // Existence checks (GET, 2 args) succeed -> policy + aliases already present.
        $client->allows('request')->with('GET', Mockery::any())->andReturn(['ok']);
        $client->allows('request')->with('PUT', Mockery::any(), Mockery::any())->andReturn([]);

        (new LogLifecycle($client))->apply();

        // Only the 3 templates are (idempotently) PUT.
        $client->shouldHaveReceived('request')->with('PUT', Mockery::any(), Mockery::any())->times(3);
    }
}
