<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\Response;

/**
 * Thrown when a request is unauthenticated (HTTP 401).
 */
class AuthenticationException extends CustomException
{
    protected string $error = 'unauthenticated';

    protected string $errorMessage = 'Unauthenticated.';

    protected int $statusCode = Response::HTTP_UNAUTHORIZED;

    /**
     * AuthenticationException constructor
     */
    public function __construct(?Exception $exception = null)
    {
        parent::__construct($exception);

        if ($exception) {
            $this->report = true;
        }
    }
}
