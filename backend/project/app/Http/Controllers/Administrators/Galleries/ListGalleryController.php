<?php

namespace App\Http\Controllers\Administrators\Galleries;

use App\Http\Controllers\Controller;
use App\Models\Misc\Galleries\Gallery;
use App\Models\Misc\Galleries\Resources\GalleryResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * List gallery images (latest first, paginated).
 */
class ListGalleryController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/galleries',
        summary: 'List gallery images',
        security: [['bearerAuth' => []]],
        tags: ['Gallery'],
        responses: [
            new OA\Response(response: 200, description: 'A page of gallery images', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Gallery')),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
        ],
    )]
    public function __invoke(): AnonymousResourceCollection
    {
        return GalleryResource::collection(Gallery::latest()->paginate());
    }
}
