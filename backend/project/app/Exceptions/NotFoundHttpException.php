<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown for an unknown or invalid URL (HTTP 404).
 */
class NotFoundHttpException extends CustomException
{
    protected string $error = 'invalid_url';

    protected string $errorMessage = 'Invalid URL.';

    protected int $statusCode = Response::HTTP_NOT_FOUND;
}
