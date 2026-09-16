<?php

namespace App\Services\FeatureFlags;

use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Cache;

/**
 * Cache-backed runtime feature flags, manageable by authorized administrators.
 *
 * Each flag in the config('feature-flags.flags') registry reads its value from
 * the shared cache; when no override has been stored it falls back to the
 * registry's config key (the pre-existing env-driven default), so behavior is
 * unchanged until an admin flips a flag. A cache flush therefore reverts every
 * flag to its fallback — notably maintenance_mode fails open (switches off).
 */
class FeatureFlags
{
    /**
     * Cache key prefix for stored flag overrides.
     */
    public const CACHE_PREFIX = 'feature-flag:';

    /**
     * Whether the named flag is currently enabled.
     */
    public function enabled(string $name): bool
    {
        $fallback = $this->fallbackKeyOrFail($name);

        $override = Cache::get(self::CACHE_PREFIX.$name);

        if ($override !== null) {
            return (bool) $override;
        }

        return $fallback !== null && (bool) config($fallback);
    }

    /**
     * Store a runtime override for the named flag.
     */
    public function set(string $name, bool $enabled): void
    {
        $this->fallbackKeyOrFail($name);

        Cache::forever(self::CACHE_PREFIX.$name, $enabled);
    }

    /**
     * Every registered flag with its current enabled state.
     *
     * @return array<string, bool>
     */
    public function all(): array
    {
        return collect(config('feature-flags.flags'))
            ->map(fn ($fallback, $name) => $this->enabled($name))
            ->all();
    }

    /**
     * Resolve the flag's config fallback key, refusing unregistered names.
     */
    protected function fallbackKeyOrFail(string $name): ?string
    {
        $flags = config('feature-flags.flags', []);

        if (! array_key_exists($name, $flags)) {
            throw new ModelNotFoundException("Feature flag [{$name}] is not registered.");
        }

        return $flags[$name];
    }
}
