<?php

namespace App\Exceptions;

use Illuminate\Http\Response;
use Throwable;

/**
 * Catch-all exception for unexpected errors, wrapping them in the
 * standardized JSON error envelope.
 */
class GeneralException extends CustomException
{
    protected string $error = 'general_exception';

    protected string $errorMessage = 'Something went wrong. Please try again later.';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;

    protected bool $report = true;

    /**
     * GeneralException constructor.
     */
    public function __construct(Throwable $exception)
    {
        parent::__construct($exception);
    }
}
