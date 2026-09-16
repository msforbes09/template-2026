<?php

namespace App\Exceptions;

use Carbon\CarbonInterface;
use Illuminate\Http\Response;

/**
 * Thrown when attempts/resends are exhausted and the identifier is temporarily
 * locked (HTTP 429).
 */
class OtpLockedException extends CustomException
{
    protected string $error = 'otp_locked';

    protected string $errorMessage = 'Too many attempts. Please try again later.';

    protected int $statusCode = Response::HTTP_TOO_MANY_REQUESTS;

    /**
     * @param  int  $retryAfter  Seconds until the lock clears.
     * @param  CarbonInterface|null  $lockedUntil  When the lock clears, when known.
     */
    public function __construct(int $retryAfter, ?CarbonInterface $lockedUntil = null)
    {
        parent::__construct();

        $this->meta = array_filter(
            ['retry_after' => $retryAfter, 'locked_until' => $lockedUntil?->format('Y-m-d H:i:s')],
            fn ($value) => $value !== null,
        );
    }
}
