<?php

namespace App\Exceptions;

use Illuminate\Http\Response;
use Illuminate\Support\Carbon;

/**
 * Thrown when a profile-details or photo change lands inside the post-completion
 * cooldown window (HTTP 400). `meta.next_change_at` is the DAY the next change is
 * allowed (Y-m-d — the window opens at the start of that day).
 */
class ProfileChangeCooldownException extends CustomException
{
    protected string $error = 'profile_change_cooldown';

    protected string $errorMessage = 'Your profile was changed recently. Please wait before changing it again.';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;

    /**
     * @param  Carbon  $nextChangeAt  When the cooldown lapses.
     */
    public function __construct(Carbon $nextChangeAt)
    {
        parent::__construct();

        $this->meta = ['next_change_at' => $nextChangeAt->format('Y-m-d')];
    }
}
