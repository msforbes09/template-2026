<?php

namespace App\Http\Controllers\Administrators\Logs;

use App\Http\Controllers\Controller;
use App\Models\Misc\Audits\Audit;
use App\Models\Misc\Audits\Resources\AuditLogResource;
use OpenApi\Attributes as OA;

/**
 * Show a single audit record in full, including the old/new value change set
 * (reads MySQL — the detail store).
 */
class ShowAuditLogController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/audit-logs/{id}',
        summary: 'Show an audit record',
        description: 'Requires `audit-logs-view`. Pass the list `id` ("{Y_m}:{id}") — its month prefix locates the record; a bare numeric id resolves against the current month. Includes the old/new value change set.',
        security: [['bearerAuth' => []]],
        tags: ['Logs'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, description: 'The list `id` ("{Y_m}:{id}"); a bare numeric id resolves against the current month.', schema: new OA\Schema(type: 'string'), example: '2026_07:4096'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Audit record', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/AuditLog')])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
        ],
    )]
    public function __invoke(string $id): AuditLogResource
    {
        return AuditLogResource::make(Audit::findByReferenceOrFail($id));
    }
}
