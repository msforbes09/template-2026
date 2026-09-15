<?php

namespace App\Models\Broadcasts;

use App\Enums\BroadcastStatusEnum;
use App\Exceptions\BroadcastNotOwnedException;
use App\Exceptions\InvalidBroadcastStatusException;
use App\Jobs\SendBroadcast;
use App\Models\Administrators\Administrator;
use App\Models\Users\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * One admin announcement for users — all registered users, a filtered
 * subset (`status` filter), or a single user (`user_uuid`). Created as
 * a DRAFT: nothing is delivered until the creator explicitly starts it
 * (draft → sending → sent, the queued SendBroadcast job stamping
 * `recipients_count`/`completed_at` + `sent`). Only the CREATOR may edit,
 * delete (soft — the history keeps its shape), or start; drafts alone are
 * mutable. The row is the audited history record.
 */
class Broadcast extends Model implements Auditable
{
    use AuditableTrait;
    use SoftDeletes;

    /**
     * Default attribute values — a new broadcast is born a draft (mirrored by
     * the column default; set here too so the in-memory model is correct
     * before a refresh).
     *
     * @var array<string, string>
     */
    protected $attributes = ['status' => BroadcastStatusEnum::DRAFT->value];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = ['administrator_id', 'status', 'title', 'body', 'filters', 'recipients_count', 'started_at', 'completed_at'];

    /**
     * Get the attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['filters' => 'array', 'started_at' => 'datetime', 'completed_at' => 'datetime'];
    }

    /**
     * The administrator who created it.
     */
    public function administrator(): BelongsTo
    {
        return $this->belongsTo(Administrator::class);
    }

    /**
     * Record a new draft — nothing is delivered until start().
     *
     * @param  array<string, string>  $filters
     */
    public static function draft(Administrator $admin, string $title, string $body, array $filters): static
    {
        return static::create([
            'administrator_id' => $admin->getKey(),
            'title' => $title,
            'body' => $body,
            'filters' => $filters === [] ? null : $filters,
        ]);
    }

    /**
     * Update the draft's message and targeting (whole-set replacement, like
     * creation). Drafts only.
     *
     * @param  array<string, string>  $filters
     */
    public function updateDraft(string $title, string $body, array $filters): void
    {
        $this->checkDraft();

        $this->update([
            'title' => $title,
            'body' => $body,
            'filters' => $filters === [] ? null : $filters,
        ]);
    }

    /**
     * Soft-delete the draft. Drafts only — a started broadcast is history.
     */
    public function discard(): void
    {
        $this->checkDraft();

        $this->delete();
    }

    /**
     * Start the fan-out: draft → sending, delivery queued. The job lands it
     * on `sent`.
     */
    public function start(): void
    {
        $this->checkDraft();

        $this->update(['status' => BroadcastStatusEnum::SENDING->value, 'started_at' => now()]);

        SendBroadcast::dispatch($this);
    }

    /**
     * Assert the given admin created this broadcast, else 403.
     */
    public function checkOwner(int $adminId): void
    {
        if ((int) $this->administrator_id !== $adminId) {
            throw new BroadcastNotOwnedException;
        }
    }

    /**
     * Assert the broadcast is still a draft, else 400.
     */
    protected function checkDraft(): void
    {
        if ($this->status !== BroadcastStatusEnum::DRAFT->value) {
            throw new InvalidBroadcastStatusException;
        }
    }

    /**
     * The recipient query this broadcast targets: all registered (non-deleted)
     * users, narrowed by the stored filters. `user_uuid` wins outright.
     *
     * @return Builder<User>
     */
    public function recipients(): Builder
    {
        $filters = $this->filters ?? [];
        $query = User::query();

        if (! empty($filters['user_uuid'])) {
            return $query->where('uuid', (string) $filters['user_uuid']);
        }

        if (! empty($filters['status'])) {
            $query->where('status', (string) $filters['status']);
        }

        return $query;
    }
}
