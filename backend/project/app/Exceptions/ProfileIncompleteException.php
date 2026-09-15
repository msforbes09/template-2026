<?php

namespace App\Exceptions;

use Illuminate\Http\Response;

/**
 * Thrown when a profile is completed before its required fields are filled
 * (HTTP 400). The missing field names are returned in `meta.missing`.
 */
class ProfileIncompleteException extends CustomException
{
    protected string $error = 'profile_incomplete';

    protected string $errorMessage = 'Please fill in every required profile field first.';

    protected int $statusCode = Response::HTTP_BAD_REQUEST;

    /**
     * @param  list<string>  $missing  The required fields that are still empty.
     */
    public function __construct(array $missing)
    {
        parent::__construct();

        $this->meta = ['missing' => $missing];
    }
}
