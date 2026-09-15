<?php

namespace App\Http\Controllers\Administrators\Roles;

use App\Http\Controllers\Controller;
use App\Models\Access\Roles\Resources\RoleResource;
use App\Models\Access\Roles\Role;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * List roles.
 */
class ListRoleController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/roles',
        summary: 'List roles',
        description: 'Requires the `roles-view` or `administrators-view` ability.',
        tags: ['Access'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', description: 'Fuzzy match on name', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'order_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['id', 'name', 'created_at', 'updated_at'])),
            new OA\Parameter(name: 'sort_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['asc', 'desc'])),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer', default: 20)),
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', default: 1)),
        ],
        responses: [
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 200, description: 'Paginated list of roles', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Role'))],
            )),
        ],
    )]
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        // withCount('users'): how many administrators hold each role — one
        // subquery per page, and the related model's SoftDeletingScope keeps
        // deleted admins out of the count. Deactivated admins stay in it:
        // holding a role is not the same as being able to sign in.
        return RoleResource::collection(
            Role::list($request->query(), Role::query()->withCount('users')),
        );
    }
}
