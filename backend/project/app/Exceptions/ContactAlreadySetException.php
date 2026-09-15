<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when a user tries to add a contact channel (email/mobile) they already
 * have set — this flow only adds the missing one, not changes (HTTP 400).
 */
class ContactAlreadySetException extends CustomException
{
    protected string $error = 'contact_already_set';

    protected string $errorMessage = 'This contact channel is already set on your account.';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;
}
