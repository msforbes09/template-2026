<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when a suspended or revoked user tries to (re)activate their account.
 * A disciplinary status must not be undone by scanning an activation credential.
 * HTTP 403.
 */
class AccountSuspendedException extends CustomException
{
    protected string $error = 'account_suspended';

    protected string $errorMessage = 'This account has been suspended. Contact an administrator.';

    protected int $statusCode = Response::HTTP_FORBIDDEN;
}
