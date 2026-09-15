<?php

namespace App\Http\Controllers\Administrators\FeatureFlags;

use App\Http\Controllers\Controller;
use App\Services\FeatureFlags\FeatureFlags;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Lists every registered runtime feature flag with its current state.
 */
class ListFeatureFlagsController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/feature-flags',
        summary: 'List feature flags',
        description: 'Every registered runtime feature flag with its current enabled state (a stored admin override, or the environment default when none is stored). Requires the developer-access ability (is_developer administrators only).',
        security: [['bearerAuth' => []]],
        tags: ['Feature Flags'],
        responses: [
            new OA\Response(response: 200, description: 'The registered flags', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/FeatureFlag')),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope')),
            new OA\Response(response: 403, description: 'Missing permission', content: new OA\JsonContent(ref: '#/components/schemas/ErrorEnvelope')),
        ],
    )]
    public function __invoke(FeatureFlags $flags): JsonResponse
    {
        return response()->json([
            'data' => collect($flags->all())
                ->map(fn (bool $enabled, string $name) => ['name' => $name, 'enabled' => (int) $enabled])
                ->values(),
        ]);
    }
}
