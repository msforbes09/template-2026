<?php

namespace App\Http\Controllers\Administrators\Documentations;

use App\Http\Controllers\Controller;
use App\Models\Documentations\Documentation;
use App\Models\Documentations\Resources\DocumentationResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * List documentation blocks (paginated, filterable).
 */
class ListDocumentationController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/documentations',
        summary: 'List documentation blocks',
        security: [['bearerAuth' => []]],
        tags: ['Documentations'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', description: 'Fuzzy match on identifier', schema: new OA\Schema(type: 'string'), example: 'terms'),
            new OA\Parameter(name: 'identifier', in: 'query', description: 'Exact-match filter on identifier', schema: new OA\Schema(type: 'string'), example: 'terms-of-service'),
            new OA\Parameter(name: 'order_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['id', 'identifier', 'created_at', 'updated_at'], default: 'id')),
            new OA\Parameter(name: 'sort_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['asc', 'desc'], default: 'desc')),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer', default: 20, maximum: 100)),
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', default: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated documentations', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Documentation')),
            ])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
        ],
    )]
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        return DocumentationResource::collection(Documentation::list($request->query()));
    }
}
