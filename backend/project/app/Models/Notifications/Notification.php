<?php

namespace App\Models\Notifications;

use App\Models\Users\User;
use Illuminate\Notifications\DatabaseNotification;
use OpenSearch\ScoutDriverPlus\Searchable;

/**
 * One in-app notification. Extends the framework's DatabaseNotification (keeps
 * markAsRead() and the read()/unread() scopes) but stores an auto-increment
 * integer id and a SHORT dotted `type` (each notification class overrides
 * databaseType()), never a class name. The recipient is a morph (`notifiable`)
 * so administrators can join as recipients later with no schema change.
 *
 * Searchable into ONE permanent index (`{prefix}notifications`, no
 * rollover/ISM — pruned by `notifications:prune` instead, both stores): a lean
 * list/filter document only, the `data` payload stays MySQL-only.
 */
class Notification extends DatabaseNotification
{
    use Searchable;

    /**
     * The bare index name (prefixed by `searchableAs()`).
     */
    public const RESOURCE_KEY = 'notifications';

    /**
     * The framework parent assumes a uuid key; this table auto-increments.
     */
    public $incrementing = true;

    /**
     * The primary key type.
     *
     * @var string
     */
    protected $keyType = 'int';

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'notifications';

    /**
     * The index name: the shared platform prefix + the resource key.
     */
    public function searchableAs(): string
    {
        return config('opensearch.migrations.prefixes.index').static::RESOURCE_KEY;
    }

    /**
     * The lean OpenSearch document — list/filter fields only; the `data`
     * payload (remarks, references) never reaches the cluster. Adding a field
     * here means adding it to `searchableMapping()` too.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'notifiable_type' => $this->notifiable_type,
            'notifiable_id' => $this->notifiable_id,
            'is_read' => $this->read_at !== null ? 1 : 0,
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * OpenSearch field types for the document above (applied by the
     * create_notifications_index OpenSearch migration).
     *
     * @return array<string, array<string, mixed>>
     */
    public static function searchableMapping(): array
    {
        return [
            'id' => ['type' => 'long'],
            'type' => ['type' => 'keyword'],
            'notifiable_type' => ['type' => 'keyword'],
            'notifiable_id' => ['type' => 'long'],
            'is_read' => ['type' => 'integer'],
            'created_at' => ['type' => 'date', 'format' => 'yyyy-MM-dd HH:mm:ss'],
        ];
    }

    /**
     * Resolve the user's own notification by id or throw (renders 404) —
     * a foreign or unknown id is indistinguishable from a missing one.
     */
    public static function findOwnedOrFail(User $user, int $id): static
    {
        return static::query()
            ->where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->getKey())
            ->findOrFail($id);
    }
}
