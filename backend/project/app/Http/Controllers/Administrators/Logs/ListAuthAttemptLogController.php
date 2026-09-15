<?php

namespace App\Http\Controllers\Administrators\Logs;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListLogRequest;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Misc\AuthAttempts\Resources\AuthAttemptLogListResource;
use App\Services\Logs\LogQuery;
use App\Services\Security\PiiCrypter;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * List authentication attempts (paginated, minimal), filterable by guard, event,
 * the resolved account (user_type/user_id), the identifier (matched via its hash),
 * and a date range. Reads from OpenSearch with a MySQL fallback. The raw identifier
 * is never surfaced.
 */
class ListAuthAttemptLogController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/auth-attempt-logs',
        summary: 'List authentication attempts',
        description: 'Requires `auth-logs-view`. Reads from OpenSearch — filter by `guard`, `event`, `user_type`, `user_id`, `identifier` (hashed server-side and matched on `identifier_hash` — the plaintext is never stored or searched), and/or a `from`/`to` date range (spanning months). Minimal rows; the raw identifier is never exposed.',
        security: [['bearerAuth' => []]],
        tags: ['Logs'],
        parameters: [
            new OA\Parameter(name: 'guard', in: 'query', description: 'Exact-match guard (administrators|users)', schema: new OA\Schema(type: 'string'), example: 'users'),
            new OA\Parameter(name: 'event', in: 'query', description: 'Exact-match event', schema: new OA\Schema(type: 'string'), example: 'invalid_credentials'),
            new OA\Parameter(name: 'user_type', in: 'query', description: 'Exact-match resolved account type (Administrator|User) — set when the attempt matched an account', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'user_id', in: 'query', description: 'Exact-match resolved account id — combine with `user_type` for "every login event for this account"', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'identifier', in: 'query', description: 'The email / mobile as the user enters it (e.g. user@example.com or +639171234567). Hashed with the PII key server-side and matched exactly on `identifier_hash`; case/whitespace-insensitive.', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'from', in: 'query', description: 'Start date (inclusive, YYYY-MM-DD)', schema: new OA\Schema(type: 'string'), example: '2026-08-01'),
            new OA\Parameter(name: 'to', in: 'query', description: 'End date (inclusive, YYYY-MM-DD)', schema: new OA\Schema(type: 'string'), example: '2026-08-31'),            new OA\Parameter(name: 'per_page', in: 'query', description: 'Items per page (default 20, max 100)', schema: new OA\Schema(type: 'integer', maximum: 100)),
            new OA\Parameter(name: 'page', in: 'query', description: 'Page number', schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated auth attempts', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/AuthAttemptLogList'))])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
        ],
    )]
    public function __invoke(ListLogRequest $request, LogQuery $query, PiiCrypter $crypter): AnonymousResourceCollection
    {
        $filters = $request->filtersWith([
            'guard' => $request->query('guard'),
            'event' => $request->query('event'),
            'user_type' => $request->query('user_type'),
            'user_id' => $request->query('user_id'),
            // The plaintext never reaches the query: hash it like the recorder does.
            'identifier_hash' => filled($request->query('identifier')) ? $crypter->hash((string) $request->query('identifier')) : null,
        ]);

        $logs = $query->list(AuthAttempt::class, $filters, $request->perPage(), $request->page());

        return AuthAttemptLogListResource::collection($logs);
    }
}
