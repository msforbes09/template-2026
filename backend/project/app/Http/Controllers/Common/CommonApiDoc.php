<?php

namespace App\Http\Controllers\Common;

use OpenApi\Attributes as OA;

/**
 * OpenAPI document root for the Common API (shared, cross-group endpoints).
 */
#[OA\Info(
    title: 'Common API',
    version: '1.0.0',
    description: 'Shared endpoints not tied to a single API group (e.g. OTP resend).',
)]
#[OA\Server(url: L5_SWAGGER_CONST_HOST_LOCAL.'/common', description: 'Local / current environment')]
#[OA\Server(url: L5_SWAGGER_CONST_HOST_STAGING.'/common', description: 'Staging')]
#[OA\Server(url: L5_SWAGGER_CONST_HOST_PRODUCTION.'/common', description: 'Production')]
#[OA\SecurityScheme(securityScheme: 'bearerAuth', type: 'http', scheme: 'bearer')]
#[OA\Tag(name: 'Feature Flags', description: 'The public runtime feature-flag map — the UIs\' reference for the maintenance page, the developer-application CTA, and the review surfaces. Stays up during maintenance mode.')]
#[OA\Tag(name: 'OTP', description: 'One-time PIN utilities.')]
#[OA\Tag(name: 'Files', description: 'File uploads (Cloudflare R2: private bucket via presigned URL, public bucket via custom domain).')]
#[OA\Tag(name: 'Contents', description: 'Public content blocks by identifier.')]
#[OA\Tag(name: 'Addresses', description: 'Address reference data — countries + PSGC regions/provinces/municipalities/barangays.')]
#[OA\Schema(
    schema: 'ErrorEnvelope',
    type: 'object',
    properties: [
        new OA\Property(property: 'error', type: 'string', example: 'invalid_otp'),
        new OA\Property(property: 'message', type: 'string', example: 'The one-time PIN is invalid or has expired.'),
        new OA\Property(property: 'error_description', type: 'string', example: 'The one-time PIN is invalid or has expired.'),
    ],
)]
#[OA\Schema(
    schema: 'ValidationError',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', example: 'The file field is required.'),
        new OA\Property(property: 'errors', type: 'object', example: ['file' => ['The file field is required.']]),
    ],
)]
#[OA\Schema(schema: 'UnauthenticatedError', type: 'object', properties: [
    new OA\Property(property: 'error', type: 'string', example: 'unauthenticated'),
    new OA\Property(property: 'message', type: 'string', example: 'Unauthenticated.'),
    new OA\Property(property: 'error_description', type: 'string', example: 'Unauthenticated.'),
])]
#[OA\Schema(schema: 'ForbiddenError', type: 'object', properties: [
    new OA\Property(property: 'error', type: 'string', example: 'insufficient_permissions'),
    new OA\Property(property: 'message', type: 'string', example: 'You do not have the required permission.'),
    new OA\Property(property: 'error_description', type: 'string', example: 'You do not have the required permission.'),
])]
#[OA\Schema(schema: 'NotFoundError', type: 'object', properties: [
    new OA\Property(property: 'error', type: 'string', example: 'data_not_found'),
    new OA\Property(property: 'message', type: 'string', example: 'Data record not found.'),
    new OA\Property(property: 'error_description', type: 'string', example: 'Data record not found.'),
])]
#[OA\Schema(schema: 'BadRequestError', type: 'object', properties: [
    new OA\Property(property: 'error', type: 'string', example: 'invalid_request'),
    new OA\Property(property: 'message', type: 'string', example: 'The request could not be processed.'),
    new OA\Property(property: 'error_description', type: 'string', example: 'The request could not be processed.'),
])]
#[OA\Schema(schema: 'TooManyRequestsError', type: 'object', properties: [
    new OA\Property(property: 'error', type: 'string', example: 'too_many_requests'),
    new OA\Property(property: 'message', type: 'string', example: 'Too many requests. Please slow down and try again shortly.'),
    new OA\Property(property: 'error_description', type: 'string', example: 'Too many requests. Please slow down and try again shortly.'),
])]
final class CommonApiDoc {}
