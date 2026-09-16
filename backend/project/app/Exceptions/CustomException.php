<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Base API exception that renders a standardized JSON error envelope.
 */
class CustomException extends Exception
{
    /**
     * Error
     */
    protected string $error = 'custom_exception';

    /**
     * Error message
     */
    protected string $errorMessage = 'Something went wrong. Please try again later.';

    /**
     * Status code
     */
    protected int $statusCode = Response::HTTP_BAD_REQUEST;

    /**
     * Description
     */
    protected ?string $description = null;

    /**
     * Meta
     */
    protected ?array $meta = null;

    /**
     * Report
     */
    protected bool $report = false;

    /**
     * CustomException constructor
     */
    public function __construct(?Throwable $e = null)
    {
        $errorMessage = trans($this->errorMessage);

        if ($e && $e->getMessage()) {
            $errorMessage = $e->getMessage();
        }

        parent::__construct($errorMessage);
    }

    /**
     * Render
     */
    public function render(): JsonResponse
    {
        $errorData = [
            'error' => $this->error,
            'message' => trans($this->errorMessage),
            'error_description' => trans($this->description ?? $this->errorMessage),
        ];

        if ($this->meta) {
            $errorData['meta'] = $this->meta;
        }

        return response()->json($errorData, $this->statusCode);
    }

    /**
     * The exception's meta payload, if any.
     *
     * @return array<string, mixed>|null
     */
    public function getMeta(): ?array
    {
        return $this->meta;
    }

    /**
     * Report
     *
     * @return void
     */
    public function report()
    {
        if ($this->report) {
            Log::error($this->getMessage(), ['exception' => $this]);
        }
    }
}
