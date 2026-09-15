<?php

namespace App\Http\Controllers\Administrators\Contents;

use App\Http\Controllers\Controller;
use App\Models\Contents\Content;
use App\Models\Contents\Requests\StoreContentRequest;
use App\Models\Contents\Resources\ContentResource;
use OpenApi\Attributes as OA;

/**
 * Create a content block.
 */
class CreateContentController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/contents',
        summary: 'Create a content block',
        security: [['bearerAuth' => []]],
        tags: ['Contents'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['identifier', 'body'],
            properties: [
                new OA\Property(property: 'identifier', type: 'string', description: 'Slug (lowercase alphanumeric, dashes, underscores)', example: 'terms-of-service'),
                new OA\Property(property: 'body', type: 'object', example: ['en' => '<p>The terms...</p>']),
                new OA\Property(property: 'meta', type: 'object', nullable: true, example: ['title' => 'Terms of Service']),
            ],
        )),
        responses: [
            new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Content')])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(StoreContentRequest $request): ContentResource
    {
        return ContentResource::make(Content::create($request->validated()));
    }
}
