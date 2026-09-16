<?php

namespace App\Models\Concerns;

use App\Exceptions\PasswordChangedTooRecentlyException;
use App\Models\Misc\PasswordHistories\PasswordHistory;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Facades\Hash;

/**
 * Records every password the model is given: a `password_histories` row per
 * hash (bounded by `auth.password_policy.history_limit`) and a
 * `password_changed_at` stamp on the model.
 *
 * Hooks the model events, so every path that sets a password — registration,
 * change, reset, an admin-issued temporary password, account recovery — is
 * covered without each caller having to remember to.
 */
trait HasPasswordHistory
{
    /**
     * Register the model events that stamp and record a newly set password.
     */
    public static function bootHasPasswordHistory(): void
    {
        static::saving(function (self $model) {
            if ($model->isDirty('password') && ($model->getAttributes()['password'] ?? null) !== null) {
                $model->password_changed_at = now();
            }
        });

        // Two events rather than `saved` + `wasRecentlyCreated`: that flag stays
        // true for the instance's whole lifetime, so a later save in the same
        // request (a seeder's create-then-update) would record the hash twice.
        static::created(fn (self $model) => $model->recordPasswordHistory());
        static::updated(function (self $model) {
            if ($model->wasChanged('password')) {
                $model->recordPasswordHistory();
            }
        });
    }

    /**
     * Record the current hash, then prune. A no-op with no password or a 0 limit.
     */
    protected function recordPasswordHistory(): void
    {
        $hash = $this->getAttributes()['password'] ?? null;

        if ($hash === null || static::passwordHistoryLimit() <= 0) {
            return;
        }

        $this->passwordHistories()->create(['password' => $hash]);
        $this->prunePasswordHistory();
    }

    /**
     * Initialize the trait: cast the stamp it maintains.
     */
    public function initializeHasPasswordHistory(): void
    {
        $this->mergeCasts(['password_changed_at' => 'datetime']);
    }

    /**
     * Refuse a voluntary password change made before the minimum age has passed.
     *
     * @throws PasswordChangedTooRecentlyException
     */
    public function assertPasswordOldEnoughToChange(): void
    {
        $hours = (int) config('auth.password_policy.min_age_hours', 24);

        if ($hours <= 0 || $this->password_changed_at === null) {
            return;
        }

        $availableAt = $this->password_changed_at->copy()->addHours($hours);

        if ($availableAt->isFuture()) {
            throw new PasswordChangedTooRecentlyException($availableAt);
        }
    }

    /**
     * Whether the plain-text password matches any hash in the history window
     * (the current password included). Always false when the limit is 0.
     */
    public function hasRecentlyUsedPassword(string $plain): bool
    {
        $limit = static::passwordHistoryLimit();

        if ($limit <= 0) {
            return false;
        }

        return $this->passwordHistories()
            ->latest('id')
            ->limit($limit)
            ->pluck('password')
            ->contains(fn (string $hash) => Hash::check($plain, $hash));
    }

    /**
     * Drop history rows beyond the configured limit, oldest first.
     */
    public function prunePasswordHistory(): void
    {
        $limit = static::passwordHistoryLimit();

        if ($limit <= 0) {
            return;
        }

        $keep = $this->passwordHistories()->latest('id')->limit($limit)->pluck('id');

        $this->passwordHistories()->whereNotIn('id', $keep)->delete();
    }

    /**
     * How many recent passwords are remembered (0 = the check is disabled).
     */
    protected static function passwordHistoryLimit(): int
    {
        return (int) config('auth.password_policy.history_limit', 5);
    }

    /**
     * The password hashes this model has held, oldest first.
     *
     * @return MorphMany<PasswordHistory, $this>
     */
    public function passwordHistories(): MorphMany
    {
        return $this->morphMany(PasswordHistory::class, 'owner');
    }
}
