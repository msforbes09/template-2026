<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when an administrator targets their own account through the management
 * endpoints — the path that lets a manager grant themselves the Super Admin role,
 * or swap their own email and reset the password onto it. HTTP 403.
 */
class SelfManagementException extends CustomException
{
    protected string $error = 'self_management_forbidden';

    protected string $errorMessage = 'You cannot manage your own account through these endpoints.';

    protected int $statusCode = Response::HTTP_FORBIDDEN;
}
