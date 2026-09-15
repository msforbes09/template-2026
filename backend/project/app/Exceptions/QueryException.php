<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when a database query fails.
 */
class QueryException extends CustomException
{
    protected string $error = 'data_processing_failed';

    protected string $errorMessage = 'Data processing failed.';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;

    protected bool $report = true;
}
