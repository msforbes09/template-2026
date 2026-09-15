<?php

namespace App\Models\Access\Permissions;

use App\Models\Access\PermissionGroups\PermissionGroup;
use Database\Factories\Access\Permissions\PermissionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;
use Spatie\Permission\Models\Permission as SpatiePermission;

/**
 * A permission, scoped to the administrators guard and grouped for the UI.
 */
class Permission extends SpatiePermission implements Auditable
{
    use AuditableTrait;

    /** @use HasFactory<PermissionFactory> */
    use HasFactory;

    use SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = ['name', 'guard_name', 'group_id'];

    /**
     * The group this permission belongs to.
     *
     * @return BelongsTo<PermissionGroup, $this>
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(PermissionGroup::class, 'group_id');
    }
}
