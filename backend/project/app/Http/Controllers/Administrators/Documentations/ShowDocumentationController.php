<?php

namespace App\Http\Controllers\Administrators\Documentations;

use App\Http\Controllers\Controller;
use App\Models\Documentations\Documentation;
use App\Models\Documentations\Resources\DocumentationResource;
use OpenApi\Attributes as OA;

/**
 * Show a single documentation block.
 */
class ShowDocumentationController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/documentations/{documentation}',
        summary: 'Show a documentation block',
        security: [['bearerAuth' => []]],
        tags: ['Documentations'],
        parameters: [new OA\Parameter(name: 'documentation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)],
        responses: [
            new OA\Response(response: 200, description: 'Documentation', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Documentation')])),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
        ],
    )]
    public function __invoke(Documentation $documentation): DocumentationResource
    {
        return DocumentationResource::make($documentation);
    }
}
