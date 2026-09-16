<?php

namespace App\Http\Controllers\Administrators\Administrators;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Administrators\Resources\AdministratorListResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * List administrators.
 */
class ListAdministratorController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/administrators',
        summary: 'List administrators',
        description: 'Requires the `administrators-view` ability.',
        tags: ['Administrators'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', description: 'Fuzzy match across email and name', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'is_active', in: 'query', description: 'Filter by active status', schema: new OA\Schema(type: 'integer', enum: [0, 1])),
            new OA\Parameter(name: 'with_temporary_password', in: 'query', description: 'Filter by temporary-password flag', schema: new OA\Schema(type: 'integer', enum: [0, 1])),
            new OA\Parameter(name: 'role', in: 'query', description: 'Only administrators holding this role (role id)', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'order_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['id', 'email', 'first_name', 'last_name', 'created_at', 'updated_at'])),
            new OA\Parameter(name: 'sort_by', in: 'query', schema: new OA\Schema(type: 'string', enum: ['asc', 'desc'])),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer', default: 20)),
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', default: 1)),
        ],
        responses: [
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 200, description: 'Paginated list of administrators. Email is masked in the list (like `a•••@example.com`); the full address is on `GET /administrators/{id}`.', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Administrator')),
                ],
            )),
        ],
    )]
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        // `role` is a relation filter, not a column, so it rides the base
        // query rather than FILTERABLE (which whitelists real columns).
        $query = Administrator::query()->when(
            $request->query('role'),
            fn ($query, $role) => $query->whereHas('roles', fn ($roles) => $roles->whereKey($role)),
        );

        $administrators = Administrator::list($request->query(), $query);
        // `roles` included: the resource guards it with whenLoaded(), so
        // omitting it here silently dropped the field from every row and left
        // the UI backfilling roles with one audited show request per row.
        $administrators->getCollection()->load('photo', 'roles');

        return AdministratorListResource::collection($administrators);
    }
}
