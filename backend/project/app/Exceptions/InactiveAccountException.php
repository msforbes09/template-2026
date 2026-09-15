<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when an inactive administrator attempts to authenticate.
 */
class InactiveAccountException extends CustomException
{
    protected string $error = 'account_inactive';

    protected string $errorMessage = 'This account is inactive.';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;
}
