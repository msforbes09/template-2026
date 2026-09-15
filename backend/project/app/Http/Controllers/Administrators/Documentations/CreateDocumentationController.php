<?php

namespace App\Http\Controllers\Administrators\Documentations;

use App\Http\Controllers\Controller;
use App\Models\Documentations\Documentation;
use App\Models\Documentations\Requests\StoreDocumentationRequest;
use App\Models\Documentations\Resources\DocumentationResource;
use OpenApi\Attributes as OA;

/**
 * Create a documentation block.
 */
class CreateDocumentationController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/documentations',
        summary: 'Create a documentation block',
        security: [['bearerAuth' => []]],
        tags: ['Documentations'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['identifier', 'body'],
            properties: [
                new OA\Property(property: 'identifier', type: 'string', description: 'Slug (lowercase alphanumeric, dashes, underscores)', example: 'getting-started'),
                new OA\Property(property: 'body', type: 'object', description: 'Documentation content (free-form; e.g. markdown/HTML + format)', example: ['format' => 'markdown', 'content' => "## Getting Started\n\nBase URL: `https://api.example.com/v1`\n\n### Authentication\nSend `Authorization: Bearer <token>`."]),
                new OA\Property(property: 'meta', type: 'object', nullable: true, example: ['title' => 'Getting Started', 'version' => 'v1', 'category' => 'integration']),
            ],
        )),
        responses: [
            new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Documentation')])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(StoreDocumentationRequest $request): DocumentationResource
    {
        return DocumentationResource::make(Documentation::create($request->validated()));
    }
}
