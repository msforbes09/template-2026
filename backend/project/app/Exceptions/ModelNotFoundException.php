<?php

namespace App\Exceptions;

use Illuminate\Database\Eloquent\ModelNotFoundException as EloquentModelNotFoundException;
use Illuminate\Http\Response;

/**
 * Thrown when a queried model or record cannot be found.
 */
class ModelNotFoundException extends CustomException
{
    protected string $error = 'data_not_found';

    protected string $errorMessage = 'Data record not found.';

    protected int $statusCode = Response::HTTP_NOT_FOUND;

    /**
     * ModelNotFoundException constructor
     */
    public function __construct(?EloquentModelNotFoundException $exception = null, ?string $model = null)
    {
        if ($exception) {
            $sections = explode('\\', $exception->getModel());

            $model = trim(preg_replace('/(?<!\ )[A-Z]/', ' $0', end($sections)));

            $this->errorMessage = "{$model} not found.";
        }

        if ($model) {
            $this->errorMessage = "{$model} not found.";
        }

        parent::__construct($exception);
    }
}
