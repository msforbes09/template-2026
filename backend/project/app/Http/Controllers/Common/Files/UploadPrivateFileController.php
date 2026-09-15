<?php

namespace App\Http\Controllers\Common\Files;

use App\Enums\FileEnum;
use App\Http\Controllers\Controller;
use App\Models\Misc\Files\Requests\UploadFileRequest;
use App\Models\Misc\Files\Resources\FileResource;
use OpenApi\Attributes as OA;

/**
 * Upload a private file and return its UUID + a cached S3 presigned URL on the private R2 bucket.
 */
class UploadPrivateFileController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/files/private',
        summary: 'Upload a private file',
        security: [['bearerAuth' => []]],
        tags: ['Files'],
        requestBody: new OA\RequestBody(required: true, content: new OA\MediaType(
            mediaType: 'multipart/form-data',
            schema: new OA\Schema(required: ['file'], properties: [
                new OA\Property(property: 'file', type: 'string', format: 'binary'),
            ]),
        )),
        responses: [
            new OA\Response(response: 201, description: 'Uploaded', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'object', properties: [
                    new OA\Property(property: 'uuid', type: 'string', example: '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f'),
                    new OA\Property(property: 'url', type: 'string', description: 'S3 presigned URL on the private bucket (expires ~3h)', example: 'https://<account-id>.r2.cloudflarestorage.com/private-bucket/uploads/9f1c....jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=11100&X-Amz-Signature=...'),
                    new OA\Property(property: 'original_name', type: 'string', example: 'contract.pdf'),
                    new OA\Property(property: 'mime_type', type: 'string', example: 'application/pdf'),
                    new OA\Property(property: 'size', type: 'integer', example: 20481),
                ]),
            ])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
            new OA\Response(response: 422, description: 'Validation error (not an image / too large / failed security check)', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
            new OA\Response(response: 429, description: 'Too many uploads (rate-limited per authenticated principal)', content: new OA\JsonContent(ref: '#/components/schemas/TooManyRequestsError')),
        ],
    )]
    public function __invoke(UploadFileRequest $request): FileResource
    {
        return FileResource::make($request->user()->uploadFile($request->file('file'), FileEnum::VISIBILITY['PRIVATE']));
    }
}
