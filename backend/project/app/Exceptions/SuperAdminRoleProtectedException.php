<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when the roles API targets the Super Admin role itself.
 *
 * The role is the thing that confers every permission, so it must be immutable
 * over HTTP. Left editable, it defeats every other guard: renaming it would slip
 * past a name-based super-admin check, stripping its permissions would silently
 * disarm the account holding it, and deleting it would strand the deployment with
 * no path back to full access. HTTP 403.
 */
class SuperAdminRoleProtectedException extends CustomException
{
    protected string $error = 'super_admin_role_protected';

    protected string $errorMessage = 'The Super Admin role cannot be modified or deleted.';

    protected int $statusCode = Response::HTTP_FORBIDDEN;
}
