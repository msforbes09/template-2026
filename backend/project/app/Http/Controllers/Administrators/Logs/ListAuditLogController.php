<?php

namespace App\Http\Controllers\Administrators\Logs;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListLogRequest;
use App\Models\Misc\Audits\Audit;
use App\Models\Misc\Audits\Resources\AuditLogListResource;
use App\Services\Logs\LogQuery;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * List audit records (paginated, minimal), filterable by event, auditable_type,
 * auditable_id, the actor (user_type/user_id), and a date range. Reads from
 * OpenSearch with a MySQL fallback.
 */
class ListAuditLogController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/audit-logs',
        summary: 'List audit records',
        description: 'Requires `audit-logs-view`. Reads from OpenSearch — filter by `event`, `auditable_type`, `auditable_id`, `user_type`, `user_id`, and/or a `from`/`to` date range (spanning months). Minimal rows; the old/new value blobs are not surfaced here.',
        security: [['bearerAuth' => []]],
        tags: ['Logs'],
        parameters: [
            new OA\Parameter(name: 'event', in: 'query', description: 'Exact-match event (created|updated|deleted|…)', schema: new OA\Schema(type: 'string'), example: 'updated'),
            new OA\Parameter(name: 'auditable_type', in: 'query', description: 'Exact-match subject type', schema: new OA\Schema(type: 'string'), example: 'User'),
            new OA\Parameter(name: 'auditable_id', in: 'query', description: 'Exact-match subject id — combine with `auditable_type` for "every change to this record"', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'user_type', in: 'query', description: 'Exact-match actor type (Administrator|User)', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'user_id', in: 'query', description: 'Exact-match actor id — combine with `user_type` for "everything this actor did"', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'from', in: 'query', description: 'Start date (inclusive, YYYY-MM-DD)', schema: new OA\Schema(type: 'string'), example: '2026-08-01'),
            new OA\Parameter(name: 'to', in: 'query', description: 'End date (inclusive, YYYY-MM-DD)', schema: new OA\Schema(type: 'string'), example: '2026-08-31'),            new OA\Parameter(name: 'per_page', in: 'query', description: 'Items per page (default 20, max 100)', schema: new OA\Schema(type: 'integer', maximum: 100)),
            new OA\Parameter(name: 'page', in: 'query', description: 'Page number', schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated audit records', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/AuditLogList'))])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
        ],
    )]
    public function __invoke(ListLogRequest $request, LogQuery $query): AnonymousResourceCollection
    {
        $filters = $request->filtersWith([
            'event' => $request->query('event'),
            'auditable_type' => $request->query('auditable_type'),
            'auditable_id' => $request->query('auditable_id'),
            'user_type' => $request->query('user_type'),
            'user_id' => $request->query('user_id'),
        ]);

        $logs = $query->list(Audit::class, $filters, $request->perPage(), $request->page());

        return AuditLogListResource::collection($logs);
    }
}
