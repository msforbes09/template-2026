<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when a user tries to use a basic feature (reviewing/replying) before
 * completing their profile. HTTP 400.
 */
class ProfileNotCompletedException extends CustomException
{
    protected string $error = 'profile_incomplete';

    protected string $errorMessage = 'Please complete your profile before reviewing projects.';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;
}
