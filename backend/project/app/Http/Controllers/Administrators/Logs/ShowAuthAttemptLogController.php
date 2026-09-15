<?php

namespace App\Http\Controllers\Administrators\Logs;

use App\Http\Controllers\Controller;
use App\Models\Misc\AuthAttempts\AuthAttempt;
use App\Models\Misc\AuthAttempts\Resources\AuthAttemptLogResource;
use OpenApi\Attributes as OA;

/**
 * Show a single authentication attempt in full (reads MySQL — the detail store).
 * The identifier is returned masked.
 */
class ShowAuthAttemptLogController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/auth-attempt-logs/{id}',
        summary: 'Show an authentication attempt',
        description: 'Requires `auth-logs-view`. Pass the list `id` ("{Y_m}:{id}") — its month prefix locates the record; a bare numeric id resolves against the current month. The identifier is returned masked; the plaintext is kept only in the encrypted at-rest blob.',
        security: [['bearerAuth' => []]],
        tags: ['Logs'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, description: 'The list `id` ("{Y_m}:{id}"); a bare numeric id resolves against the current month.', schema: new OA\Schema(type: 'string'), example: '2026_07:512'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Authentication attempt', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/AuthAttemptLog')])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
        ],
    )]
    public function __invoke(string $id): AuthAttemptLogResource
    {
        return AuthAttemptLogResource::make(AuthAttempt::findByReferenceOrFail($id));
    }
}
