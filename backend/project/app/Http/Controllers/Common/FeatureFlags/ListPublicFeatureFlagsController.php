<?php

namespace App\Http\Controllers\Common\FeatureFlags;

use App\Http\Controllers\Controller;
use App\Services\FeatureFlags\FeatureFlags;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * The public feature-flag map — the UIs' reference for which surfaces are on
 * (maintenance banner, developer-application CTA, review surfaces).
 * Deliberately outside the maintenance gate so it stays readable while
 * maintenance mode is on.
 */
class ListPublicFeatureFlagsController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/common/feature-flags',
        summary: 'Read the feature-flag map',
        description: 'The current state of every runtime feature flag, as a flat name => enabled map. Public, and stays up during maintenance mode — the UIs read it to decide whether to render the maintenance page, the developer-application CTA, and the review surfaces.',
        tags: ['Feature Flags'],
        responses: [
            new OA\Response(response: 200, description: 'The flag map', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'object', properties: [
                    new OA\Property(property: 'developer_applications', type: 'integer', enum: [0, 1], example: 1),
                    new OA\Property(property: 'project_reviews', type: 'integer', enum: [0, 1], example: 1),
                    new OA\Property(property: 'api_catalog_reviews', type: 'integer', enum: [0, 1], example: 1),
                    new OA\Property(property: 'maintenance_mode', type: 'integer', enum: [0, 1], example: 0),
                ]),
            ])),
        ],
    )]
    public function __invoke(FeatureFlags $flags): JsonResponse
    {
        return response()->json([
            'data' => collect($flags->all())->map(fn (bool $enabled) => (int) $enabled)->all(),
        ]);
    }
}
