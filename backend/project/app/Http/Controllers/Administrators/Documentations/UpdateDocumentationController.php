<?php

namespace App\Http\Controllers\Administrators\Documentations;

use App\Http\Controllers\Controller;
use App\Models\Documentations\Documentation;
use App\Models\Documentations\Requests\UpdateDocumentationRequest;
use App\Models\Documentations\Resources\DocumentationResource;
use OpenApi\Attributes as OA;

/**
 * Update a documentation block.
 */
class UpdateDocumentationController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Put(
        path: '/documentations/{documentation}',
        summary: 'Update a documentation block',
        security: [['bearerAuth' => []]],
        tags: ['Documentations'],
        parameters: [new OA\Parameter(name: 'documentation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)],
        requestBody: new OA\RequestBody(content: new OA\JsonContent(properties: [
            new OA\Property(property: 'identifier', type: 'string', example: 'getting-started'),
            new OA\Property(property: 'body', type: 'object', nullable: true, description: 'Documentation content (free-form; e.g. markdown/HTML + format)', example: ['format' => 'markdown', 'content' => "## Getting Started (updated)\n\nBase URL: `https://api.example.com/v1`"]),
            new OA\Property(property: 'meta', type: 'object', nullable: true, example: ['title' => 'Getting Started', 'version' => 'v1', 'category' => 'integration']),
        ])),
        responses: [
            new OA\Response(response: 200, description: 'Updated', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Documentation')])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(UpdateDocumentationRequest $request, Documentation $documentation): DocumentationResource
    {
        $documentation->update($request->validated());

        return DocumentationResource::make($documentation);
    }
}
