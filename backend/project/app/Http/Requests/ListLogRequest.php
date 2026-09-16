<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared validation + normalization for the admin log-list endpoints (connections,
 * auth-attempts, audits): the common date-range / pagination params. Each controller
 * supplies its own exact-match term filters. The route enforces authorization.
 */
class ListLogRequest extends FormRequest
{
    /**
     * The route middleware enforces access; nothing extra here.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for the common query params.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * The LogQuery filter set: the given (non-empty) term filters plus the date range.
     *
     * @param  array<string, mixed>  $terms
     * @return array<string, mixed>
     */
    public function filtersWith(array $terms): array
    {
        return [
            'terms' => array_filter($terms, fn ($value) => $value !== null && $value !== ''),
            'from' => $this->query('from'),
            'to' => $this->query('to'),
        ];
    }

    /**
     * Items per page (1..100, default 20).
     */
    public function perPage(): int
    {
        return min(max((int) $this->query('per_page', 20), 1), 100);
    }

    /**
     * Current page (>= 1).
     */
    public function page(): int
    {
        return max((int) $this->query('page', 1), 1);
    }
}
