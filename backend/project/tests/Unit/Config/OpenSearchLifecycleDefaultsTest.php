<?php

namespace Tests\Unit\Config;

use App\Services\OpenSearch\LogLifecycle;
use Tests\TestCase;

/**
 * Pins the log-retention default: three months unless an environment says
 * otherwise. Logs older than that are the audit tables' job, not the search
 * cluster's.
 */
class OpenSearchLifecycleDefaultsTest extends TestCase
{
    /**
     * With OPENSEARCH_LOG_RETENTION_MONTHS unset, retention is three months (91 days).
     */
    public function test_default_retention_is_three_months(): void
    {
        $this->assertNull(env('OPENSEARCH_LOG_RETENTION_MONTHS'));

        $this->assertSame(3, config('opensearch.lifecycle.retention_months'));
        // 3 months -> 91 days is the delete transition's age in the ISM policy.
        $this->assertStringContainsString('"min_index_age":"91d"', json_encode($this->app->make(LogLifecycle::class)->plan()));
    }
}
