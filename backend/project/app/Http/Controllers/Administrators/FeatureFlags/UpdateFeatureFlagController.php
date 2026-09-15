<?php

namespace App\Http\Controllers\Administrators\FeatureFlags;

use App\Http\Controllers\Controller;
use App\Services\FeatureFlags\FeatureFlags;
use App\Services\FeatureFlags\Requests\UpdateFeatureFlagRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use OpenApi\Attributes as OA;

/**
 * Toggles a runtime feature flag, storing the override in the shared cache.
 * The flip is application-logged with the acting administrator's id (the
 * cache-backed store has no audit trail of its own).
 */
#[OA\Schema(
    schema: 'FeatureFlag',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', example: 'developer_applications'),
        new OA\Property(property: 'enabled', type: 'integer', enum: [0, 1], example: 1),
    ],
)]
class UpdateFeatureFlagController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Put(
        path: '/feature-flags/{name}',
        summary: 'Toggle a feature flag',
        description: 'Stores a runtime override for the named flag (developer_applications, project_reviews, api_catalog_reviews, maintenance_mode). Requires the developer-access ability, which only is_developer administrators receive at login. Note: clearing the application cache reverts every flag to its environment default.',
        security: [['bearerAuth' => []]],
        tags: ['Feature Flags'],
        parameters: [
            new OA\Parameter(name: 'name', in: 'path', required: true, schema: new OA\Schema(type: 'string'), example: 'developer_applications'),
        ],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['enabled'],
            properties: [
                new OA\Property(property: 'enabled', type: 'integer', enum: [0, 1], example: 0),
            ],
        )),
        responses: [
            new OA\Response(response: 200, description: 'The updated flag', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/FeatureFlag', type: 'object'),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope')),
            new OA\Response(response: 403, description: 'Missing the developer-access ability', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope')),
            new OA\Response(response: 404, description: 'Unknown flag name', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope')),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(UpdateFeatureFlagRequest $request, FeatureFlags $flags, string $name): JsonResponse
    {
        $enabled = (bool) $request->validated('enabled');

        $flags->set($name, $enabled);

        Log::info('Feature flag toggled.', [
            'flag' => $name,
            'enabled' => $enabled,
            'administrator_id' => $request->user('administrators')->getKey(),
        ]);

        return response()->json([
            'data' => ['name' => $name, 'enabled' => (int) $enabled],
        ]);
    }
}
