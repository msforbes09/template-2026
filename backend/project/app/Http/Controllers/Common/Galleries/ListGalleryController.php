<?php

namespace App\Http\Controllers\Common\Galleries;

use App\Http\Controllers\Controller;
use App\Models\Misc\Galleries\Gallery;
use App\Models\Misc\Galleries\Resources\GalleryResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * List gallery images for any authenticated administrator (no permission gate).
 */
class ListGalleryController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Get(
        path: '/galleries',
        summary: 'List gallery images (any authenticated admin)',
        security: [['bearerAuth' => []]],
        tags: ['Gallery'],
        responses: [
            new OA\Response(response: 200, description: 'A page of gallery images', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object', properties: [
                    new OA\Property(property: 'uuid', type: 'string', example: '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f'),
                    new OA\Property(property: 'original_name', type: 'string', nullable: true, example: 'banner.jpg'),
                    new OA\Property(property: 'url', type: 'string', nullable: true, example: 'https://cdn.example.com/public/gallery/9f1c2d3e-….jpg'),
                ])),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
        ],
    )]
    public function __invoke(): AnonymousResourceCollection
    {
        return GalleryResource::collection(Gallery::latest()->paginate());
    }
}
