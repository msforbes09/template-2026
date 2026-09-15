<?php

namespace App\Models\Contents;

use App\Exceptions\ModelNotFoundException;
use App\Models\Concerns\Filterable;
use App\Models\Concerns\HasIdentifier;
use Database\Factories\Contents\ContentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * An admin-managed content block addressed by a slug identifier.
 */
class Content extends Model implements Auditable
{
    use AuditableTrait;
    use Filterable;

    /** @use HasFactory<ContentFactory> */
    use HasFactory;

    use HasIdentifier;
    use SoftDeletes;

    /**
     * Cache key prefix for identifier lookups.
     */
    public const CACHE_PREFIX = 'content:';

    /**
     * Columns that may be used to order the list (`order_by`).
     *
     * @var list<string>
     */
    public const SORTABLE = ['id', 'identifier', 'created_at', 'updated_at'];

    /**
     * Columns scanned by the fuzzy `search` filter.
     *
     * @var list<string>
     */
    public const SEARCHABLE = ['identifier'];

    /**
     * Columns allowed for exact-match filtering.
     *
     * @var list<string>
     */
    public const FILTERABLE = ['identifier'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = ['identifier', 'body', 'meta'];

    /**
     * Get the attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['body' => 'array', 'meta' => 'array'];
    }

    /**
     * Resolve a content by identifier, caching only on hit. The raw attribute
     * array is cached (not the Eloquent model) so it survives serializing cache
     * stores, then rehydrated via newFromBuilder.
     */
    public static function findCachedByIdentifier(string $identifier): ?static
    {
        $key = static::CACHE_PREFIX.$identifier;

        if (Cache::has($key)) {
            return (new static)->newFromBuilder(Cache::get($key));
        }

        $content = static::getByIdentifier($identifier);

        if ($content) {
            Cache::forever($key, $content->getAttributes());
        }

        return $content;
    }

    /**
     * Resolve a content by identifier or throw a uniform 404 exception.
     */
    public static function findCachedByIdentifierOrFail(string $identifier): static
    {
        return static::findCachedByIdentifier($identifier) ?? throw new ModelNotFoundException(model: 'Content');
    }

    /**
     * Bust the identifier cache on write.
     */
    protected static function booted(): void
    {
        static::saved(function (self $content) {
            Cache::forget(static::CACHE_PREFIX.$content->identifier);

            if ($content->wasChanged('identifier')) {
                Cache::forget(static::CACHE_PREFIX.$content->getOriginal('identifier'));
            }
        });

        static::deleted(fn (self $content) => Cache::forget(static::CACHE_PREFIX.$content->identifier));
    }
}
