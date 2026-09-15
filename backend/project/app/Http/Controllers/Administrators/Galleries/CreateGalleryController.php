<?php

namespace App\Http\Controllers\Administrators\Galleries;

use App\Http\Controllers\Controller;
use App\Models\Misc\Files\Requests\UploadFileRequest;
use App\Models\Misc\Galleries\Gallery;
use App\Models\Misc\Galleries\Resources\GalleryResource;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

/**
 * Upload a public gallery image and return its URL.
 */
class CreateGalleryController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/galleries',
        summary: 'Upload a gallery image',
        security: [['bearerAuth' => []]],
        tags: ['Gallery'],
        requestBody: new OA\RequestBody(required: true, content: new OA\MediaType(
            mediaType: 'multipart/form-data',
            schema: new OA\Schema(required: ['file'], properties: [
                new OA\Property(property: 'file', type: 'string', format: 'binary'),
            ]),
        )),
        responses: [
            new OA\Response(response: 201, description: 'Uploaded', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/Gallery'),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
            new OA\Response(response: 422, description: 'Validation error (not an image / too large / failed security check)', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function __invoke(UploadFileRequest $request): JsonResponse
    {
        return GalleryResource::make(Gallery::upload($request->file('file')))
            ->response()
            ->setStatusCode(201);
    }
}
