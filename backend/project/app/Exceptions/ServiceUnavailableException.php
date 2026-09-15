<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown while maintenance mode (the `maintenance_mode` runtime feature flag)
 * has a surface switched off and a request reaches it. HTTP 503.
 */
class ServiceUnavailableException extends CustomException
{
    protected string $error = 'service_unavailable';

    protected string $errorMessage = 'The service is temporarily down for maintenance. Please try again later.';

    protected int $statusCode = Response::HTTP_SERVICE_UNAVAILABLE;
}
