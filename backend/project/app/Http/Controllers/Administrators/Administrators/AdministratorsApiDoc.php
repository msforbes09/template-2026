<?php

namespace App\Http\Controllers\Administrators\Administrators;

use OpenApi\Attributes as OA;

/**
 * OpenAPI document root for the Administrators API.
 */
#[OA\Info(
    title: 'Administrators API',
    version: '1.0.0',
    description: 'Endpoints for managing administrator accounts.',
)]
#[OA\Server(url: L5_SWAGGER_CONST_HOST_LOCAL.'/administrator', description: 'Local / current environment')]
#[OA\Server(url: L5_SWAGGER_CONST_HOST_STAGING.'/administrator', description: 'Staging')]
#[OA\Server(url: L5_SWAGGER_CONST_HOST_PRODUCTION.'/administrator', description: 'Production')]
#[OA\SecurityScheme(securityScheme: 'bearerAuth', type: 'http', scheme: 'bearer')]
#[OA\Tag(name: 'Authentication', description: 'Administrator authentication')]
#[OA\Tag(name: 'Administrators', description: 'Administrator account management.')]
#[OA\Tag(name: 'Access', description: 'Access control — role management (assign permissions to roles) and the grouped permission catalog.')]
#[OA\Tag(name: 'Contents', description: 'Content block management (CRUD).')]
#[OA\Tag(name: 'Documentations', description: 'Manage API documentation entries (integration guides), addressed by identifier.')]
#[OA\Tag(name: 'Users', description: 'User directory (list / show by uuid).')]
#[OA\Tag(name: 'Broadcasts', description: 'Announcements pushed into the user notification center (all / filtered / single user), with history.')]
#[OA\Tag(name: 'Gallery', description: 'Public gallery images (list / upload / delete).')]
#[OA\Tag(name: 'Logs', description: 'Other operational logs (connections, authentication attempts, audit trail) — read-only lists, OpenSearch-backed with MySQL fallback.')]
#[OA\Tag(name: 'Feature Flags', description: 'Runtime feature flags — list + toggle (developer applications, review surfaces, maintenance mode). The whole surface is reserved for developer admins via the developer-access login-time ability.')]
#[OA\Schema(schema: 'File', type: 'object', properties: [
    new OA\Property(property: 'uuid', type: 'string', example: '9e2be7f8-9853-43a2-8b8b-a216a3585951'),
    new OA\Property(property: 'url', type: 'string', nullable: true, example: 'https://cdn.example.com/signed/…'),
    new OA\Property(property: 'original_name', type: 'string', nullable: true, example: 'photo.png'),
    new OA\Property(property: 'mime_type', type: 'string', nullable: true, example: 'image/png'),
    new OA\Property(property: 'size', type: 'integer', nullable: true, example: 20481),
])]
#[OA\Schema(schema: 'Gallery', type: 'object', properties: [
    new OA\Property(property: 'uuid', type: 'string', example: '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f'),
    new OA\Property(property: 'original_name', type: 'string', nullable: true, example: 'banner.jpg'),
    new OA\Property(property: 'url', type: 'string', nullable: true, example: 'https://cdn.example.com/public/gallery/9f1c2d3e-….jpg'),
])]
#[OA\Schema(
    schema: 'ErrorEnvelope',
    type: 'object',
    properties: [
        new OA\Property(property: 'error', type: 'string', example: 'error'),
        new OA\Property(property: 'message', type: 'string', example: 'An error occurred.'),
        new OA\Property(property: 'error_description', type: 'string', example: 'An error occurred.'),
    ],
)]
#[OA\Schema(
    schema: 'ValidationError',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', example: 'The email field is required.'),
        new OA\Property(
            property: 'errors',
            type: 'object',
            example: ['email' => ['The email field is required.']],
        ),
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
final class AdministratorsApiDoc {}
