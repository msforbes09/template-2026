<?php

namespace App\Http\Controllers\Administrators\Documentations;

use App\Http\Controllers\Controller;
use App\Models\Documentations\Documentation;
use App\Models\Documentations\Resources\DocumentationResource;
use OpenApi\Attributes as OA;

/**
 * Soft-delete a documentation block.
 */
class DeleteDocumentationController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Delete(
        path: '/documentations/{documentation}',
        summary: 'Delete a documentation block',
        security: [['bearerAuth' => []]],
        tags: ['Documentations'],
        parameters: [new OA\Parameter(name: 'documentation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)],
        responses: [
            new OA\Response(response: 200, description: 'Deleted', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Documentation')])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
        ],
    )]
    public function __invoke(Documentation $documentation): DocumentationResource
    {
        $documentation->delete();

        return DocumentationResource::make($documentation);
    }
}
