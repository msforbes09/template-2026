<?php

namespace Tests\Feature\Console;

use App\Services\FeatureFlags\FeatureFlags;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests the feature-flags:set CLI escape hatch — the recovery path when
 * maintenance mode is on and no developer admin can sign in.
 */
class FeatureFlagCommandTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The command stores the override and reports the resulting state.
     */
    public function test_sets_a_flag_on_and_off(): void
    {
        $this->artisan('feature-flags:set maintenance_mode on')
            ->expectsOutputToContain('ENABLED')->assertExitCode(0);
        $this->assertTrue(app(FeatureFlags::class)->enabled('maintenance_mode'));

        $this->artisan('feature-flags:set maintenance_mode off')
            ->expectsOutputToContain('DISABLED')->assertExitCode(0);
        $this->assertFalse(app(FeatureFlags::class)->enabled('maintenance_mode'));
    }

    /**
     * An unknown flag or state is refused.
     */
    public function test_refuses_invalid_input(): void
    {
        $this->artisan('feature-flags:set unknown_flag on')->assertExitCode(1);
        $this->artisan('feature-flags:set maintenance_mode bogus')->assertExitCode(1);
    }

    /**
     * With only a name argument the current state is shown without changing it.
     */
    public function test_reports_state_without_changing(): void
    {
        $this->artisan('feature-flags:set maintenance_mode')
            ->expectsOutputToContain('DISABLED')->assertExitCode(0);
        $this->assertFalse(app(FeatureFlags::class)->enabled('maintenance_mode'));
    }
}
