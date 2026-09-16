<?php

namespace Tests\Unit\Config;

use Tests\TestCase;

/**
 * Convention guard for the Horizon supervisors: every environment must work
 * every dedicated queue the app dispatches onto, or jobs on a forgotten queue
 * silently pile up.
 */
class HorizonConfigTest extends TestCase
{
    /**
     * The queues the app dispatches onto (config/audit.php, config/scout.php,
     * the mailer and connection listeners).
     */
    private const QUEUES = ['default', 'mailer', 'audit', 'connection', 'search'];

    /**
     * Each environment's supervisor lists every dedicated queue and retries three times.
     */
    public function test_every_environment_works_every_dedicated_queue(): void
    {
        $environments = config('horizon.environments');
        $defaults = config('horizon.defaults.supervisor-1');

        foreach (['local', 'staging', 'production'] as $environment) {
            $this->assertArrayHasKey($environment, $environments, "missing $environment supervisor");

            // Horizon applies each environment's entry on top of the defaults.
            $supervisor = array_merge($defaults, $environments[$environment]['supervisor-1']);
            $this->assertEqualsCanonicalizing(self::QUEUES, $supervisor['queue'], "$environment queues");
            $this->assertSame(3, $supervisor['tries'], "$environment tries");
        }
    }

    /**
     * The Redis queue keeps its retry window above the supervisor timeout so a
     * slow job is never handed to a second worker while the first still runs.
     */
    public function test_redis_retry_after_exceeds_the_supervisor_timeout(): void
    {
        $this->assertGreaterThan(
            config('horizon.defaults.supervisor-1.timeout'),
            config('queue.connections.redis.retry_after'),
        );
    }
}
