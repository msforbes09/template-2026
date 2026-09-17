<?php

namespace App\Models\Administrators;

use App\Enums\PermissionEnum;
use App\Events\Administrators\TemporaryPasswordIssued;
use App\Exceptions\PasswordExpiryWaiveUnavailableException;
use App\Models\Administrators\Concerns\AdministratorNotifications;
use App\Models\Administrators\Concerns\TwoFactorAuthenticates;
use App\Models\Concerns\Authenticates;
use App\Models\Concerns\Filterable;
use App\Models\Concerns\HasPasswordHistory;
use App\Models\Concerns\UploadsFiles;
use App\Models\Misc\Files\File;
use Carbon\CarbonInterface;
use Database\Factories\Administrators\AdministratorFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;
use Spatie\Permission\Traits\HasRoles;

/**
 * An administrator account for the API.
 */
class Administrator extends Authenticatable implements Auditable
{
    use AdministratorNotifications;
    use AuditableTrait;
    use Authenticates;
    use Filterable;
    use HasApiTokens;

    /** @use HasFactory<AdministratorFactory> */
    use HasFactory;

    use HasPasswordHistory;
    use HasRoles;
    use SoftDeletes;
    use TwoFactorAuthenticates;
    use UploadsFiles;

    /**
     * Attributes never written to the audit trail.
     *
     * @var list<string>
     */
    protected $auditExclude = [
        'password', 'auth_token', 'auth_token_expires_at', 'trusted_device',
        'auth_validated', 'last_login_at', 'photo_uuid',
    ];

    /**
     * The authentication guard this model uses.
     */
    public const AUTH_GUARD = 'administrators';

    /**
     * The role holding every permission — the first row `AccessSeeder` creates.
     *
     * Keyed on the id, not the name: the name is editable through the roles API,
     * so a name-based check could be defeated simply by renaming the role.
     */
    public const SUPER_ADMIN_ROLE_ID = 1;

    /**
     * Columns that may be used to order the list (`order_by`).
     *
     * @var list<string>
     */
    public const SORTABLE = [
        'id',
        'email',
        'first_name',
        'last_name',
        'created_at',
        'updated_at',
    ];

    /**
     * Columns scanned by the fuzzy `search` filter.
     *
     * @var list<string>
     */
    public const SEARCHABLE = [
        'email',
        'first_name',
        'last_name',
    ];

    /**
     * Columns allowed for exact-match filtering.
     *
     * @var list<string>
     */
    public const FILTERABLE = [
        'is_active',
        'with_temporary_password',
        'email',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'email',
        'first_name',
        'last_name',
        'photo_uuid',
        'password',
        'with_temporary_password',
        'is_active',
        'is_developer',
        'last_login_at',
        'auth_token',
        'auth_validated',
        'auth_token_expires_at',
        'trusted_device',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'auth_token',
        'trusted_device',
    ];

    /**
     * Get the attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'is_developer' => 'boolean',
            'with_temporary_password' => 'boolean',
            'last_login_at' => 'datetime',
            'auth_validated' => 'datetime',
            'auth_token_expires_at' => 'datetime',
            'password_expiry_waives' => 'integer',
            'password_expiry_waived_until' => 'datetime',
        ];
    }

    /**
     * When the current password expires — the lifetime from its last change, or
     * the end of the latest postponement if that is later. Null when expiry is
     * disabled or the change date is unknown.
     */
    public function passwordExpiresAt(): ?CarbonInterface
    {
        $days = (int) config('auth.administrators.password_expiry_days', 90);

        if ($days <= 0 || $this->password_changed_at === null) {
            return null;
        }

        $expiresAt = $this->password_changed_at->copy()->addDays($days);
        $waivedUntil = $this->password_expiry_waived_until;

        return $waivedUntil !== null && $waivedUntil->greaterThan($expiresAt) ? $waivedUntil : $expiresAt;
    }

    /**
     * Whether the current password is past its expiry date.
     */
    public function isPasswordExpired(): bool
    {
        return $this->passwordExpiresAt()?->isPast() ?? false;
    }

    /**
     * How many more times an expired password may be postponed.
     */
    public function passwordExpiryWaivesRemaining(): int
    {
        $max = (int) config('auth.administrators.password_expiry_max_waives', 3);

        return max(0, $max - (int) $this->password_expiry_waives);
    }

    /**
     * Use one postponement on an expired password: the expiry moves forward by
     * `password_expiry_waive_days`, so the policy is enforced by the clock and
     * the console is gated once the last postponement runs out.
     *
     * @throws PasswordExpiryWaiveUnavailableException
     */
    public function waivePasswordExpiry(): void
    {
        if (! $this->isPasswordExpired() || $this->passwordExpiryWaivesRemaining() === 0) {
            throw new PasswordExpiryWaiveUnavailableException;
        }

        $days = (int) config('auth.administrators.password_expiry_waive_days', 7);

        $this->forceFill([
            'password_expiry_waives' => $this->password_expiry_waives + 1,
            'password_expiry_waived_until' => now()->addDays($days),
        ])->save();
    }

    /**
     * Bootstrap the model: a new password starts a fresh expiry lifetime.
     */
    protected static function booted(): void
    {
        static::saving(function (self $administrator) {
            if ($administrator->isDirty('password') && ! $administrator->isDirty('password_expiry_waives')) {
                $administrator->password_expiry_waives = 0;
                $administrator->password_expiry_waived_until = null;
            }
        });
    }

    /**
     * The administrator's profile photo (a private uploaded file).
     */
    public function photo(): BelongsTo
    {
        return $this->belongsTo(File::class, 'photo_uuid', 'uuid');
    }

    /**
     * The permission names bound to a freshly issued token. Developer admins
     * additionally receive the developer-access VIRTUAL ability — never a
     * seeded permission, so it can only ever arrive through this login-time
     * grant (it gates the developer-only surfaces and rides the token so the
     * FE can key those controls off the profile's permissions list).
     *
     * @return list<string>
     */
    protected function tokenAbilities(): array
    {
        $abilities = $this->getAllPermissions()->pluck('name')->all();

        if ($this->is_developer) {
            $abilities[] = PermissionEnum::DEVELOPER_ACCESS;
        }

        return $abilities;
    }

    /**
     * Create an administrator with an auto-generated temporary password.
     *
     * @param  array<string, mixed>  $attributes
     */
    public static function createAndGeneratePassword(array $attributes): self
    {
        $temporaryPassword = Str::password(8, symbols: false);

        $administrator = static::create([
            ...$attributes,
            'password' => $temporaryPassword,
            'with_temporary_password' => true,
            'is_active' => true,
        ]);

        TemporaryPasswordIssued::dispatch($administrator, $temporaryPassword);

        return $administrator;
    }

    /**
     * Whether this administrator holds the all-permissions Super Admin role.
     *
     * Deliberately keyed on the role's id and not the account's: the seeded id-1
     * *account* is bootstrap-only and gets removed once a deployment is set up,
     * whereas the id-1 *role* is what actually confers every permission.
     */
    public function isSuperAdmin(): bool
    {
        return $this->roles()->whereKey(self::SUPER_ADMIN_ROLE_ID)->exists();
    }

    /**
     * Toggle the administrator's active status.
     *
     * Switching an admin off also kills any 2FA handshake already in flight — an
     * `auth_token` issued moments earlier would otherwise still be redeemable for a
     * bearer token on an account that is no longer allowed to log in.
     */
    public function toggleActiveStatus(): void
    {
        $this->update(['is_active' => ! $this->is_active]);

        if (! $this->is_active) {
            $this->update(['auth_token' => null]);
            $this->logout();
        }
    }

    /**
     * Issue a new temporary password to the administrator.
     */
    public function resetPassword(): void
    {
        $temporaryPassword = Str::password(8, symbols: false);

        $this->update([
            'password' => $temporaryPassword,
            'with_temporary_password' => true,
        ]);

        $this->resetTwoFactorState();
        $this->logout();

        TemporaryPasswordIssued::dispatch($this, $temporaryPassword);
    }

    /**
     * Sync the administrator's roles, recording the change as an audit.
     *
     * @param  array<int, int|string>  $roleIds
     */
    public function syncRolesAndAudit(array $roleIds): void
    {
        $this->auditSync('roles', $roleIds);

        // Token abilities are a snapshot taken at login, so a demoted admin would
        // otherwise keep the permissions they held when they signed in — including,
        // via GrantablePermissionRule, the ability to hand those permissions out.
        // Revoke their sessions and make them sign in again against the new roles.
        $this->tokens()->delete();
    }
}
