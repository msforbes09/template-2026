<?php

namespace App\Models\Access\Roles;

use App\Models\Concerns\Filterable;
use Database\Factories\Access\Roles\RoleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * An administrator role — a named bundle of permissions.
 */
class Role extends SpatieRole implements Auditable
{
    use AuditableTrait;
    use Filterable;

    /** @use HasFactory<RoleFactory> */
    use HasFactory;

    use SoftDeletes;

    /**
     * Columns that may be used to order the list (`order_by`).
     *
     * @var list<string>
     */
    public const SORTABLE = ['id', 'name', 'created_at', 'updated_at'];

    /**
     * Columns scanned by the fuzzy `search` filter.
     *
     * @var list<string>
     */
    public const SEARCHABLE = ['name'];

    /**
     * Columns allowed for exact-match filtering.
     *
     * @var list<string>
     */
    public const FILTERABLE = ['name'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = ['name', 'guard_name', 'description', 'meta'];

    /**
     * Get the attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    /**
     * Sync the role's permissions, recording the change as an audit.
     *
     * @param  array<int, int|string>  $permissionIds
     */
    public function syncPermissionsAndAudit(array $permissionIds): void
    {
        $this->auditSync('permissions', $permissionIds);

        // Revoke the sessions of every admin holding this role. Token abilities are
        // a login-time snapshot, so a just-revoked permission would otherwise stay
        // usable — and re-grantable via GrantablePermissionRule, which reads the
        // same snapshot — until the token expired. Mirrors syncRolesAndAudit().
        $this->users()->get()->each(function ($model): void {
            if (method_exists($model, 'tokens')) {
                $model->tokens()->delete();
            }
        });
    }
}
