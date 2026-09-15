<?php

namespace App\Http\Controllers\Administrators\Permissions;

use App\Http\Controllers\Controller;
use App\Models\Access\PermissionGroups\PermissionGroup;
use App\Models\Access\PermissionGroups\Resources\PermissionGroupResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * List permission groups with their permissions (for UI rendering).
 */
class ListPermissionController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/permissions',
        summary: 'List permission groups with their permissions (for rendering)',
        description: 'Groups are sorted alphabetically by name. Requires the `roles-view` ability.',
        tags: ['Access'],
        security: [['bearerAuth' => []]],
        responses: [
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 200, description: 'Permission groups with nested permissions', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PermissionGroup'))],
            )),
        ],
    )]
    public function __invoke(): AnonymousResourceCollection
    {
        // Groups alphabetically; permissions inside each group keep id order.
        return PermissionGroupResource::collection(
            PermissionGroup::with('permissions')->orderBy('name')->get()
        );
    }
}
