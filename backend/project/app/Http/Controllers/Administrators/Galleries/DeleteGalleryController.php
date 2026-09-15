<?php

namespace App\Http\Controllers\Administrators\Galleries;

use App\Http\Controllers\Controller;
use App\Models\Misc\Galleries\Gallery;
use App\Models\Misc\Galleries\Resources\GalleryResource;
use OpenApi\Attributes as OA;

/**
 * Delete a gallery image (record + S3 object).
 */
class DeleteGalleryController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Delete(
        path: '/galleries/{gallery}',
        summary: 'Delete a gallery image',
        security: [['bearerAuth' => []]],
        tags: ['Gallery'],
        parameters: [new OA\Parameter(name: 'gallery', in: 'path', required: true, schema: new OA\Schema(type: 'string'), example: '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f')],
        responses: [
            new OA\Response(response: 200, description: 'Deleted', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Gallery')])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 404, description: 'Not found', content: new OA\JsonContent(ref: '#/components/schemas/NotFoundError')),
        ],
    )]
    public function __invoke(Gallery $gallery): GalleryResource
    {
        $gallery->delete();

        return GalleryResource::make($gallery);
    }
}
