<?php

namespace App\Exceptions;

use Carbon\CarbonInterface;
use Illuminate\Http\Response;

/**
 * Thrown when a voluntary password change arrives before the minimum password
 * age has elapsed (HTTP 400). `meta.available_at` says when a change is allowed.
 */
class PasswordChangedTooRecentlyException extends CustomException
{
    protected string $error = 'password_changed_too_recently';

    protected string $errorMessage = 'Your password was changed recently. Please try again later.';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;

    /**
     * Create the exception with the moment a change becomes possible.
     */
    public function __construct(CarbonInterface $availableAt)
    {
        $this->meta = ['available_at' => $availableAt->format('Y-m-d H:i:s')];

        parent::__construct();
    }
}
