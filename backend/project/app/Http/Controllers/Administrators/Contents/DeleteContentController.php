<?php

namespace App\Http\Controllers\Administrators\Contents;

use App\Http\Controllers\Controller;
use App\Models\Contents\Content;
use App\Models\Contents\Resources\ContentResource;
use OpenApi\Attributes as OA;

/**
 * Soft-delete a content block.
 */
class DeleteContentController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Delete(
        path: '/contents/{content}',
        summary: 'Delete a content block',
        security: [['bearerAuth' => []]],
        tags: ['Contents'],
        parameters: [new OA\Parameter(name: 'content', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)],
        responses: [
            new OA\Response(response: 200, description: 'Deleted', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Content')])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
        ],
    )]
    public function __invoke(Content $content): ContentResource
    {
        $content->delete();

        return ContentResource::make($content);
    }
}
