<?php

namespace App\Http\Controllers\Administrators\Logs;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListLogRequest;
use App\Models\Misc\Connections\Connection;
use App\Models\Misc\Connections\Resources\ConnectionLogListResource;
use App\Services\Logs\LogQuery;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * List outbound connection logs (paginated, minimal), filterable by type,
 * status_code, reference, and a date range. Reads from OpenSearch with a MySQL fallback.
 */
class ListConnectionLogController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/connection-logs',
        summary: 'List outbound connection logs',
        description: 'Requires `connection-logs-view`. Reads from OpenSearch — filter by `type`, `status_code`, `reference` (exact match), and/or a `from`/`to` date range (spanning months). Minimal rows.',
        security: [['bearerAuth' => []]],
        tags: ['Logs'],
        parameters: [
            new OA\Parameter(name: 'type', in: 'query', description: 'Exact-match connection type', schema: new OA\Schema(type: 'string'), example: 'sms'),
            new OA\Parameter(name: 'status_code', in: 'query', description: 'HTTP status — an exact code (e.g. 200) or a status class like 5xx (matches 500–599; also 1xx–4xx)', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'reference', in: 'query', description: 'Exact-match correlation reference (e.g. the masked mobile `+6391*****567`, an exchange code, a uniqid)', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'from', in: 'query', description: 'Start date (inclusive, YYYY-MM-DD)', schema: new OA\Schema(type: 'string'), example: '2026-08-01'),
            new OA\Parameter(name: 'to', in: 'query', description: 'End date (inclusive, YYYY-MM-DD)', schema: new OA\Schema(type: 'string'), example: '2026-08-31'),            new OA\Parameter(name: 'per_page', in: 'query', description: 'Items per page (default 20, max 100)', schema: new OA\Schema(type: 'integer', maximum: 100)),
            new OA\Parameter(name: 'page', in: 'query', description: 'Page number', schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated connection logs', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/ConnectionLogList'))])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
        ],
    )]
    public function __invoke(ListLogRequest $request, LogQuery $query): AnonymousResourceCollection
    {
        $filters = $request->filtersWith([
            'type' => $request->query('type'),
            'status_code' => $request->query('status_code'),
            'reference' => $request->query('reference'),
        ]);

        $logs = $query->list(Connection::class, $filters, $request->perPage(), $request->page());

        return ConnectionLogListResource::collection($logs);
    }
}
