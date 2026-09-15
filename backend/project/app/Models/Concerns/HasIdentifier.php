<?php

namespace App\Models\Concerns;

/**
 * Lookup helpers for models addressed by a slug `identifier` column.
 */
trait HasIdentifier
{
    /**
     * Get a record by its identifier (null if none).
     */
    public static function getByIdentifier(string $identifier): ?static
    {
        return static::query()->where('identifier', $identifier)->first();
    }
}
