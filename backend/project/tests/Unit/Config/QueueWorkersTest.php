<?php

namespace Tests\Unit\Config;

use Tests\TestCase;

/**
 * Convention guard for the pm2 process list: Horizon owns every queue worker,
 * so no hand-written queue:work process may reappear beside it, and the two
 * processes Horizon does not own (scheduler, Reverb) must stay.
 */
class QueueWorkersTest extends TestCase
{
    /**
     * Decode queue-workers.json keyed by process name.
     *
     * @return array<string, array{args: list<string>}>
     */
    private function processes(): array
    {
        $entries = json_decode(file_get_contents(base_path('queue-workers.json')), true);

        return array_column($entries, null, 'name');
    }

    /**
     * pm2 runs Horizon, the scheduler and Reverb, and nothing else.
     */
    public function test_pm2_runs_horizon_the_scheduler_and_reverb_only(): void
    {
        $processes = $this->processes();

        $this->assertEqualsCanonicalizing(['horizon', 'worker-scheduler', 'reverb-server'], array_keys($processes));
        $this->assertSame(['horizon'], $processes['horizon']['args']);
        $this->assertContains('schedule:run', $processes['worker-scheduler']['args']);
        $this->assertContains('reverb:start', $processes['reverb-server']['args']);
    }

    /**
     * Horizon's metrics need a snapshot on the scheduler.
     */
    public function test_scheduler_snapshots_horizon_metrics(): void
    {
        $commands = collect($this->app->make(\Illuminate\Console\Scheduling\Schedule::class)->events())
            ->map(fn ($event) => $event->command)
            ->filter()
            ->implode("\n");

        $this->assertStringContainsString('horizon:snapshot', $commands);
    }
}
