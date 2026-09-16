<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Exception carrying a caller-supplied message in the JSON error envelope.
 */
class CustomMessageException extends CustomException
{
    protected string $error = 'custom_exception';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;

    protected bool $report = true;

    /**
     * CustomMessageException Constructor
     */
    public function __construct(string $message, bool $report = true)
    {
        $this->errorMessage = trim($message, " \n\r\t\v\0");

        $this->report = $report;

        parent::__construct();
    }
}
