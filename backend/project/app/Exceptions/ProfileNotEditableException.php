<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when a non-website account attempts to self-edit its externally
 * owned profile (HTTP 403).
 */
class ProfileNotEditableException extends CustomException
{
    protected string $error = 'profile_not_editable';

    protected string $errorMessage = 'Only website-registered accounts can edit their profile.';

    protected int $statusCode = Response::HTTP_FORBIDDEN;
}
