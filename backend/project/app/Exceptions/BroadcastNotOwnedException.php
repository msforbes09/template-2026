<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when an administrator touches a broadcast they did not create — only
 * the creator may edit, delete, or start one (HTTP 403).
 */
class BroadcastNotOwnedException extends CustomException
{
    protected string $error = 'broadcast_not_owned';

    protected string $errorMessage = 'Only the administrator who created this broadcast can manage it.';

    protected int $statusCode = Response::HTTP_FORBIDDEN;
}
