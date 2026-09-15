<?php

namespace App\Models\Access\PermissionGroups;

use App\Models\Access\Permissions\Permission;
use Database\Factories\Access\PermissionGroups\PermissionGroupFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * A named group of permissions, used to render the permission catalog.
 */
class PermissionGroup extends Model implements Auditable
{
    use AuditableTrait;

    /** @use HasFactory<PermissionGroupFactory> */
    use HasFactory;

    use SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = ['name', 'description', 'meta'];

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
     * The permissions belonging to this group.
     *
     * @return HasMany<Permission, $this>
     */
    public function permissions(): HasMany
    {
        return $this->hasMany(Permission::class, 'group_id');
    }
}
