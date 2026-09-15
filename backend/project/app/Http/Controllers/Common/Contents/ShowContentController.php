<?php

namespace App\Http\Controllers\Common\Contents;

use App\Http\Controllers\Controller;
use App\Models\Contents\Content;
use App\Models\Contents\Resources\ContentResource;
use OpenApi\Attributes as OA;

/**
 * Public show of a content block by its identifier (cached).
 */
class ShowContentController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/contents/{identifier}',
        summary: 'Get a content block by identifier',
        tags: ['Contents'],
        parameters: [new OA\Parameter(name: 'identifier', in: 'path', required: true, schema: new OA\Schema(type: 'string'), example: 'terms-of-service')],
        responses: [
            new OA\Response(response: 200, description: 'Content', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Content')])),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
        ],
    )]
    public function __invoke(string $identifier): ContentResource
    {
        return ContentResource::make(Content::findCachedByIdentifierOrFail($identifier));
    }
}
