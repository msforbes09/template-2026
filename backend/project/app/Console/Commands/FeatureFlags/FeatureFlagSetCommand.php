<?php

namespace App\Console\Commands\FeatureFlags;

use App\Services\FeatureFlags\FeatureFlags;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Sets (or reports) a runtime feature flag from the CLI — the escape hatch for
 * the HTTP toggle, e.g. when maintenance mode is on and no developer admin can
 * sign in. With no state argument it reports the flag's current value.
 */
class FeatureFlagSetCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'feature-flags:set {name : The flag name} {state? : on or off}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Set a runtime feature flag on/off, or show its current state';

    /**
     * Execute the console command.
     */
    public function handle(FeatureFlags $flags): int
    {
        $name = $this->argument('name');
        $state = $this->argument('state');

        if ($state !== null && ! in_array($state, ['on', 'off'], true)) {
            $this->error("Invalid state '{$state}'. Use 'on' or 'off'.");

            return self::FAILURE;
        }

        try {
            if ($state !== null) {
                $flags->set($name, $state === 'on');
            }

            $enabled = $flags->enabled($name);
        } catch (ModelNotFoundException) {
            $this->error("Unknown feature flag '{$name}'.");

            return self::FAILURE;
        }

        $this->info("Feature flag {$name} is ".($enabled ? 'ENABLED' : 'DISABLED').'.');

        return self::SUCCESS;
    }
}
