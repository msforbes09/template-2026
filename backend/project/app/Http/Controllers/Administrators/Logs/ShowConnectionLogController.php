<?php

namespace App\Http\Controllers\Administrators\Logs;

use App\Http\Controllers\Controller;
use App\Models\Misc\Connections\Connection;
use App\Models\Misc\Connections\Resources\ConnectionLogResource;
use OpenApi\Attributes as OA;

/**
 * Show a single outbound connection log in full (reads MySQL — the detail store).
 */
class ShowConnectionLogController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/connection-logs/{id}',
        summary: 'Show a connection log',
        description: 'Requires `connection-logs-view`. Pass the list `id` ("{Y_m}:{id}") — its month prefix locates the record; a bare numeric id resolves against the current month.',
        security: [['bearerAuth' => []]],
        tags: ['Logs'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, description: 'The list `id` ("{Y_m}:{id}"); a bare numeric id resolves against the current month.', schema: new OA\Schema(type: 'string'), example: '2026_07:2048'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Connection log', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/ConnectionLog')])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
        ],
    )]
    public function __invoke(string $id): ConnectionLogResource
    {
        return ConnectionLogResource::make(Connection::findByReferenceOrFail($id));
    }
}
