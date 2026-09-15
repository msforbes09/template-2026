<?php

namespace App\Models\Users;

use App\Enums\AuthEventEnum;
use App\Enums\UserStatusEnum;
use App\Models\Addresses\Countries\Country;
use App\Models\Concerns\Authenticates;
use App\Models\Concerns\EncryptsPii;
use App\Models\Concerns\Filterable;
use App\Models\Concerns\HasAddress;
use App\Models\Concerns\UploadsFiles;
use App\Models\Misc\Files\File;
use App\Models\Notifications\Notification;
use App\Models\Users\Concerns\ManagesPassword;
use App\Models\Users\Concerns\ManagesProfile;
use App\Models\Users\Concerns\RegistersViaWebsite;
use App\Models\Users\Concerns\SearchableUser;
use App\Models\Users\Concerns\TwoFactorAuthenticates;
use Database\Factories\Users\UserFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\RoutesNotifications;
use Laravel\Sanctum\HasApiTokens;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * An end user of the platform, registered through the website.
 */
class User extends Authenticatable implements Auditable
{
    use AuditableTrait;
    use Authenticates;
    use EncryptsPii;
    use Filterable;
    use HasAddress;
    use HasApiTokens;

    /** @use HasFactory<UserFactory> */
    use HasFactory;

    use HasUuids;
    use ManagesPassword;
    use ManagesProfile;
    use RegistersViaWebsite;
    use RoutesNotifications;
    use SearchableUser;
    use SoftDeletes;
    use TwoFactorAuthenticates;
    use UploadsFiles;

    /**
     * The guard this model authenticates on.
     */
    public const AUTH_GUARD = 'users';

    /**
     * PII fields stored (encrypted) in the `ciphertext` blob, not as columns.
     *
     * @var list<string>
     */
    public const ENCRYPTED_PII = [
        'first_name', 'middle_name', 'last_name', 'suffix_name', 'email',
        'mobile_number', 'birth_date', 'address_line_one', 'address_line_two', 'postal_code',
        'company_name',
    ];

    /**
     * The subset that also gets a keyed-HMAC `{field}_hash` blind index.
     *
     * @var list<string>
     */
    public const HASHED_PII = ['first_name', 'last_name', 'email', 'mobile_number'];

    /**
     * Columns that may be used to order the list (`order_by`).
     *
     * @var list<string>
     */
    public const SORTABLE = ['id', 'created_at', 'updated_at'];

    /**
     * Columns scanned by the `search` filter. Blind-indexed PII fields are
     * matched exactly (on their hash); the rest keep fuzzy LIKE. See Filterable.
     *
     * @var list<string>
     */
    public const SEARCHABLE = ['first_name', 'last_name', 'email', 'mobile_number'];

    /**
     * Columns allowed for exact-match filtering.
     *
     * @var list<string>
     */
    public const FILTERABLE = ['status', 'is_active'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'email', 'password', 'email_verified_at', 'mobile_number_verified_at', 'first_name',
        'middle_name', 'last_name', 'suffix_name', 'company_name', 'mobile_number', 'birth_date',
        'gender', 'citizenship_code', 'country_code', 'region_code', 'province_code',
        'municipality_code', 'barangay_code', 'address_line_one', 'address_line_two',
        'postal_code', 'photo_uuid', 'status', 'profile_completed_at',
        'details_changed_at', 'photo_changed_at', 'is_active',
        'registration_method', 'authentication_method', 'last_login_at',
        'auth_token', 'auth_token_expires_at', 'trusted_devices',
    ];

    /**
     * Default attribute values (mirrors the DB default so a freshly-created
     * instance is active before it is reloaded).
     *
     * @var array<string, mixed>
     */
    protected $attributes = ['is_active' => true, 'status' => UserStatusEnum::DRAFT->value];

    /**
     * Attributes hidden from array/JSON output.
     *
     * @var list<string>
     */
    protected $hidden = ['password'];

    /**
     * Attributes excluded from the audit trail.
     *
     * @var list<string>
     */
    protected array $auditExclude = [
        'last_login_at', 'photo_uuid', 'meta', 'password',
        'ciphertext', 'email_hash', 'first_name_hash', 'last_name_hash', 'mobile_number_hash',
        'auth_token', 'auth_token_expires_at', 'trusted_devices',
    ];

    /**
     * The columns that receive a generated (ordered) UUID.
     *
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    /**
     * Get the attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'email_verified_at' => 'datetime',
            'mobile_number_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'profile_completed_at' => 'datetime',
            'details_changed_at' => 'datetime',
            'photo_changed_at' => 'datetime',
            'auth_token_expires_at' => 'datetime',
            'is_active' => 'boolean',
            'meta' => 'array',
            'trusted_devices' => 'array',
        ];
    }

    /**
     * The user's stored profile photo (a private File), if any.
     */
    public function photo(): BelongsTo
    {
        return $this->belongsTo(File::class, 'photo_uuid', 'uuid');
    }

    /**
     * The user's in-app notifications, newest first.
     *
     * @return MorphMany<Notification, $this>
     */
    public function notifications(): MorphMany
    {
        return $this->morphMany(Notification::class, 'notifiable')->latest('id');
    }

    /**
     * The user's unread in-app notifications.
     *
     * @return MorphMany<Notification, $this>
     */
    public function unreadNotifications(): MorphMany
    {
        return $this->notifications()->whereNull('read_at');
    }

    /**
     * The user's citizenship (nationality) resolved to a Country.
     */
    public function citizenship(): BelongsTo
    {
        return $this->belongsTo(Country::class, 'citizenship_code', 'code');
    }

    /**
     * Resolve a user by public uuid, or throw a ModelNotFoundException (rendered as
     * a 404). Used where the uuid arrives as a query param rather than a route
     * binding.
     */
    public static function findByUuidOrFail(string $uuid): self
    {
        return static::where('uuid', $uuid)->firstOrFail();
    }

    /**
     * Self-service account deletion (soft delete). Clears 2FA state + all
     * sessions, logs the event, then soft-deletes. All other data (logs, files,
     * PII) is retained — the row lives on so the log viewers can still attribute
     * past activity to this user.
     */
    public function deleteAccount(): void
    {
        $this->resetTwoFactorState();
        $this->tokens()->delete();
        static::recordAuthEvent(AuthEventEnum::ACCOUNT_DELETED, $this->email, $this);
        $this->delete();
    }

    /**
     * A display name in "First Last Suffix" form (middle name omitted).
     */
    public function displayName(): Attribute
    {
        return Attribute::make(get: function () {
            return implode(' ', array_filter([
                $this->first_name,
                $this->last_name,
                $this->suffix_name,
            ]));
        });
    }
}
