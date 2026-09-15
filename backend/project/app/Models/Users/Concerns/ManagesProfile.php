<?php

namespace App\Models\Users\Concerns;

use App\Enums\UserStatusEnum;
use App\Exceptions\InvalidUserStatusException;
use App\Exceptions\ProfileChangeCooldownException;
use App\Exceptions\ProfileIncompleteException;
use App\Exceptions\ProfileNotEditableException;
use App\Notifications\Users\ProfileCompletedNotification;
use Illuminate\Support\Carbon;

/**
 * Self-service profile editing for website-registered users: guarded update,
 * photo change, and completion.
 */
trait ManagesProfile
{
    /**
     * The non-nullable profile fields that must be filled before a profile can
     * be completed. Single source of truth for the completeness check.
     *
     * @var list<string>
     */
    public const REQUIRED_PROFILE_FIELDS = [
        'first_name', 'last_name', 'company_name', 'citizenship_code',
        'region_code', 'province_code', 'municipality_code', 'barangay_code', 'address_line_one',
    ];

    /**
     * Assert the account's status is one of the allowed values, else throw.
     *
     * @param  string|array<int, string>  $statuses
     */
    public function checkStatus(string|array $statuses): void
    {
        if (! in_array($this->status, (array) $statuses, true)) {
            throw new InvalidUserStatusException;
        }
    }

    /**
     * Update the website user's own profile details from validated data: freely
     * while `draft`, cooldown-bound (30 days per change, anchored to completion)
     * once `completed`.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateProfile(array $data): void
    {
        $this->assertWebsiteRegistration();
        $this->checkStatus([UserStatusEnum::DRAFT->value, UserStatusEnum::COMPLETED->value]);

        if ($this->editCooldownApplies()) {
            $this->checkEditCooldown('details_changed_at');
            $data['details_changed_at'] = now();
        }

        $this->update($data);
    }

    /**
     * Change (or clear) the website user's profile photo — no status lock (the
     * photo is cosmetic), but cooldown-bound once the profile is completed.
     * Setting a photo when none is attached is always allowed (and starts the
     * photo clock).
     */
    public function updatePhoto(?string $photoUuid): void
    {
        $this->assertWebsiteRegistration();

        if ($this->editCooldownApplies()) {
            if ($this->photo_uuid !== null) {
                $this->checkEditCooldown('photo_changed_at');
            }

            $this->update(['photo_uuid' => $photoUuid, 'photo_changed_at' => now()]);

            return;
        }

        $this->update(['photo_uuid' => $photoUuid]);
    }

    /**
     * Whether the edit cooldown applies in the current status (everywhere except
     * the freely-editable draft state).
     */
    protected function editCooldownApplies(): bool
    {
        return $this->status !== UserStatusEnum::DRAFT->value;
    }

    /**
     * When the given field group may next change, or null when it is freely
     * editable right now (no cooldown status, window lapsed, or — for the photo —
     * none attached yet). Feeds the profile resource so the FE can disable edit
     * controls without re-deriving the cooldown math.
     */
    public function nextChangeAllowedAt(string $clock): ?Carbon
    {
        if (! $this->editCooldownApplies()) {
            return null;
        }

        if ($clock === 'photo_changed_at' && $this->photo_uuid === null) {
            return null;
        }

        $days = (int) config('users.profile_cooldown_days', 30);
        // The window opens at the START of the lapse day (a plain date for the
        // client), not at the exact hour of the last change.
        $next = collect([$this->profile_completed_at, $this->{$clock}])->filter()->max()
            ?->copy()->addDays($days)->startOfDay();

        return $next?->isFuture() ? $next : null;
    }

    /**
     * Refuse the change when the given clock (or the completion stamp, whichever
     * is later) is still inside the cooldown window.
     */
    protected function checkEditCooldown(string $clock): void
    {
        $next = $this->nextChangeAllowedAt($clock);

        if ($next !== null) {
            throw new ProfileChangeCooldownException($next);
        }
    }

    /**
     * Complete the (website, draft) profile: every required field must be filled;
     * stamps `profile_completed_at` (the cooldown anchor) and unlocks the basic
     * features by moving the account to `completed`.
     */
    public function completeProfile(): void
    {
        $this->assertWebsiteRegistration();
        $this->checkStatus(UserStatusEnum::DRAFT->value);

        $missing = $this->missingRequiredProfileFields();

        if ($missing !== []) {
            throw new ProfileIncompleteException($missing);
        }

        // One instant seeds the completion stamp AND both cooldown clocks, so
        // post-completion the clocks are always populated (the anchor math reads
        // the later of the stamp and the clock either way).
        $now = now();

        $this->update([
            'status' => UserStatusEnum::COMPLETED->value,
            'profile_completed_at' => $now,
            'details_changed_at' => $now,
            'photo_changed_at' => $now,
        ]);

        $this->notify(new ProfileCompletedNotification);
    }

    /**
     * Only website-registered accounts may self-edit.
     */
    protected function assertWebsiteRegistration(): void
    {
        if ($this->registration_method !== 'website') {
            throw new ProfileNotEditableException;
        }
    }

    /**
     * The required profile fields that are still empty.
     *
     * @return list<string>
     */
    protected function missingRequiredProfileFields(): array
    {
        return array_values(array_filter(
            static::REQUIRED_PROFILE_FIELDS,
            fn (string $field) => blank($this->{$field}),
        ));
    }
}
