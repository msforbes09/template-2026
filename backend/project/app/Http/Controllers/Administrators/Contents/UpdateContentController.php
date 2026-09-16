<?php

namespace App\Http\Controllers\Administrators\Contents;

use App\Http\Controllers\Controller;
use App\Models\Contents\Content;
use App\Models\Contents\Requests\UpdateContentRequest;
use App\Models\Contents\Resources\ContentResource;
use OpenApi\Attributes as OA;

/**
 * Update a content block.
 */
class UpdateContentController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Put(
        path: '/contents/{content}',
        summary: 'Update a content block',
        security: [['bearerAuth' => []]],
        tags: ['Contents'],
        parameters: [new OA\Parameter(name: 'content', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)],
        requestBody: new OA\RequestBody(content: new OA\JsonContent(properties: [
            new OA\Property(property: 'identifier', type: 'string', example: 'terms-of-service'),
            new OA\Property(property: 'body', type: 'object', nullable: true, example: ['en' => '<p>Updated terms...</p>']),
            new OA\Property(property: 'meta', type: 'object', nullable: true, example: ['title' => 'Terms of Service']),
        ])),
        responses: [
            new OA\Response(response: 200, description: 'Updated', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Content')])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(UpdateContentRequest $request, Content $content): ContentResource
    {
        $content->update($request->validated());

        return ContentResource::make($content);
    }
}
