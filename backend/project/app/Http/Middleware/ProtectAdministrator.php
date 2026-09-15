<?php

namespace App\Http\Middleware;

use App\Exceptions\SelfManagementException;
use App\Exceptions\SuperAdministratorProtectedException;
use App\Models\Administrators\Administrator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the administrator-management endpoints against the two targets that turn
 * `administrators-manage` into a system takeover.
 *
 * Self-targeting: without this, an admin can sync the Super Admin role onto their
 * own id, or swap their own email and reset the password onto it. Managing your own
 * account is what `profile` and `change-password` are for. This applies to everyone,
 * super admins included.
 *
 * The super administrator: it holds every permission, so letting a *lesser* manager
 * change its email and then trigger a password reset hands them the account. A peer
 * super admin is exempt — they can already do anything, and without the exemption
 * the role would be a one-way door: grantable over the API but never revocable.
 */
class ProtectAdministrator
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $target = $request->route('administrator');

        if (! $target instanceof Administrator) {
            return $next($request);
        }

        $administrator = Administrator::authenticated();

        if ((int) $target->id === (int) $administrator->id) {
            throw new SelfManagementException;
        }

        // A peer super admin is not sealed off: they already hold every permission,
        // so the seal buys nothing against them — and sealing them out would make
        // the role a one-way door, grantable over the API but never revocable.
        if ($target->isSuperAdmin() && ! $administrator->isSuperAdmin()) {
            throw new SuperAdministratorProtectedException;
        }

        return $next($request);
    }
}
