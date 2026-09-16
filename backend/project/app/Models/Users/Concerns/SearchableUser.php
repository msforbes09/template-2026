<?php

namespace App\Models\Users\Concerns;

use OpenSearch\ScoutDriverPlus\Searchable;

/**
 * Scout/OpenSearch indexing for users: ONE plain index (`{prefix}users`, no
 * rollover — users are permanent) holding EVERY user (all statuses) as a lean
 * ZERO-PII document: ids, status flags, the four blind-index hashes (so `search`
 * stays an exact hash match, like MySQL), and the sortable dates. The admin list
 * runs filter + sort + paginate on OpenSearch and hydrates the rows from MySQL by
 * id, so names/contacts (encrypted in MySQL) never reach the cluster.
 */
trait SearchableUser
{
    use Searchable;

    /**
     * The bare index name (prefixed by `searchableAs()`).
     */
    public const RESOURCE_KEY = 'users';

    /**
     * The index name: the shared platform prefix + the resource key.
     */
    public function searchableAs(): string
    {
        return config('opensearch.migrations.prefixes.index').static::RESOURCE_KEY;
    }

    /**
     * The lean OpenSearch document. Adding a field here means adding it to
     * `searchableMapping()` too. NO raw/masked PII — hashes only.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'status' => $this->status,
            'is_active' => (int) $this->is_active,
            'first_name_hash' => $this->first_name_hash,
            'last_name_hash' => $this->last_name_hash,
            'email_hash' => $this->email_hash,
            'mobile_number_hash' => $this->mobile_number_hash,
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
            'profile_completed_at' => $this->profile_completed_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * OpenSearch field types for the document above (applied by the
     * create_users_index OpenSearch migration).
     *
     * @return array<string, array<string, mixed>>
     */
    public static function searchableMapping(): array
    {
        $date = ['type' => 'date', 'format' => 'yyyy-MM-dd HH:mm:ss'];

        return [
            'id' => ['type' => 'long'],
            'uuid' => ['type' => 'keyword'],
            'status' => ['type' => 'keyword'],
            'is_active' => ['type' => 'integer'],
            'first_name_hash' => ['type' => 'keyword'],
            'last_name_hash' => ['type' => 'keyword'],
            'email_hash' => ['type' => 'keyword'],
            'mobile_number_hash' => ['type' => 'keyword'],
            'created_at' => $date,
            'updated_at' => $date,
            'profile_completed_at' => $date,
        ];
    }
}
