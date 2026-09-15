<?php

namespace Tests\Feature\FeatureFlags;

use App\Services\FeatureFlags\FeatureFlags;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Tests the cache-backed runtime feature-flag service: config/env fallback when
 * no override is stored, admin overrides winning once set, and the whitelisted
 * registry rejecting unknown flag names.
 */
class FeatureFlagsServiceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Register an extra flag backed by a config key, the way a project adds one
     * to config/feature-flags.php.
     */
    private function registerExampleFlag(): void
    {
        config(['feature-flags.flags' => ['example_feature' => 'example.enabled', 'maintenance_mode' => null]]);
    }

    /**
     * With no stored override, a flag reads its config fallback value.
     */
    public function test_flag_falls_back_to_config_when_no_override_stored(): void
    {
        $this->registerExampleFlag();
        config(['example.enabled' => false]);

        $this->assertFalse(app(FeatureFlags::class)->enabled('example_feature'));

        config(['example.enabled' => true]);

        $this->assertTrue(app(FeatureFlags::class)->enabled('example_feature'));
    }

    /**
     * A stored override wins over the config fallback, in both directions.
     */
    public function test_stored_override_wins_over_config_fallback(): void
    {
        $this->registerExampleFlag();
        $flags = app(FeatureFlags::class);

        config(['example.enabled' => true]);
        $flags->set('example_feature', false);
        $this->assertFalse($flags->enabled('example_feature'));

        config(['example.enabled' => false]);
        $flags->set('example_feature', true);
        $this->assertTrue($flags->enabled('example_feature'));
    }

    /**
     * Maintenance mode has no env fallback and defaults to off.
     */
    public function test_maintenance_mode_defaults_off(): void
    {
        $this->assertFalse(app(FeatureFlags::class)->enabled('maintenance_mode'));
    }

    /**
     * Clearing the cache reverts a flag to its config fallback (the documented
     * fail-open caveat of the cache-backed store).
     */
    public function test_cache_flush_reverts_to_config_fallback(): void
    {
        $flags = app(FeatureFlags::class);

        $flags->set('maintenance_mode', true);
        $this->assertTrue($flags->enabled('maintenance_mode'));

        Cache::flush();

        $this->assertFalse($flags->enabled('maintenance_mode'));
    }

    /**
     * all() lists every registered flag with its current enabled state.
     */
    public function test_all_lists_every_registered_flag(): void
    {
        $this->registerExampleFlag();
        config(['example.enabled' => true]);

        $flags = app(FeatureFlags::class);
        $flags->set('maintenance_mode', true);

        $this->assertSame([
            'example_feature' => true,
            'maintenance_mode' => true,
        ], $flags->all());
    }

    /**
     * An unknown flag name is refused with a not-found on read and on write.
     */
    public function test_unknown_flag_name_is_refused(): void
    {
        $this->expectException(ModelNotFoundException::class);

        app(FeatureFlags::class)->enabled('unknown_flag');
    }

    /**
     * An unknown flag name is refused on write too.
     */
    public function test_unknown_flag_name_is_refused_on_write(): void
    {
        $this->expectException(ModelNotFoundException::class);

        app(FeatureFlags::class)->set('unknown_flag', true);
    }
}
