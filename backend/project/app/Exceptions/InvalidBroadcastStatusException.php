<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when an action is not allowed for the broadcast's current status —
 * editing, deleting, or starting anything past `draft` (HTTP 400).
 */
class InvalidBroadcastStatusException extends CustomException
{
    protected string $error = 'invalid_status';

    protected string $errorMessage = 'This action is only allowed while the broadcast is a draft.';

    // 400, not 422: 422 is reserved for Laravel validation.
    protected int $statusCode = Response::HTTP_BAD_REQUEST;
}
