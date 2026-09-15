<?php

namespace App\Http\Middleware;

use App\Exceptions\SuperAdminRoleProtectedException;
use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Seals the Super Admin role against the roles API — no rename, no permission
 * change, no delete.
 *
 * Without this, the role is the soft underbelly of every other guard: renaming it
 * would slip past any name-based super-admin check, and stripping its permissions
 * would quietly disarm whoever holds it.
 */
class ProtectSuperAdminRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $role = $request->route('role');

        if ($role instanceof Role && (int) $role->id === Administrator::SUPER_ADMIN_ROLE_ID) {
            throw new SuperAdminRoleProtectedException;
        }

        return $next($request);
    }
}
