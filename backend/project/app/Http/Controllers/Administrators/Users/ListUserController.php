<?php

namespace App\Http\Controllers\Administrators\Users;

use App\Http\Controllers\Controller;
use App\Models\Users\Resources\UserListResource;
use App\Services\Users\UserQuery;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * List users (paginated, filterable).
 */
class ListUserController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/users',
        summary: 'List users',
        security: [['bearerAuth' => []]],
        tags: ['Users'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', description: 'Fuzzy match on name or email', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'status', in: 'query', description: 'Exact-match filter on status (draft | completed)', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'is_active', in: 'query', description: 'Filter by active status', schema: new OA\Schema(type: 'integer', enum: [0, 1])),
            new OA\Parameter(name: 'order_by', in: 'query', description: 'Column to sort by (default: id)', schema: new OA\Schema(type: 'string', enum: ['id', 'created_at', 'updated_at'])),
            new OA\Parameter(name: 'sort_by', in: 'query', description: 'Sort direction (default: desc)', schema: new OA\Schema(type: 'string', enum: ['asc', 'desc'])),
            new OA\Parameter(name: 'per_page', in: 'query', description: 'Items per page (default: 20, max: 100)', schema: new OA\Schema(type: 'integer', maximum: 100)),
            new OA\Parameter(name: 'page', in: 'query', description: 'Page number (default: 1)', schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated users. Contact PII is masked in the list (email like `j•••@example.com`, mobile like `+639•••••••23`) and birth_date/gender are omitted; the full record is on `GET /users/{uuid}`. Served from OpenSearch (search matches the exact email/mobile/name via blind-index hash) with a MySQL fallback.', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/User')),
            ])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
        ],
    )]
    public function __invoke(Request $request, UserQuery $query): AnonymousResourceCollection
    {
        // The list masks contact PII and omits birth_date/gender (UserListResource);
        // address/citizenship aren't exposed here either, so only the photo is loaded.
        // Served from OpenSearch (zero-PII index — search is an exact blind-index
        // hash match) with the MySQL Filterable path as fallback.
        return UserListResource::collection($query->forAdmin($request->query()));
    }
}
