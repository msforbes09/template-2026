<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when any management endpoint targets a super administrator. The account
 * holds every permission, so an ordinary manager must not be able to change its
 * email and then reset a password onto an address they control. HTTP 403.
 */
class SuperAdministratorProtectedException extends CustomException
{
    protected string $error = 'super_administrator_protected';

    protected string $errorMessage = 'The super administrator cannot be managed through the API.';

    protected int $statusCode = Response::HTTP_FORBIDDEN;
}
