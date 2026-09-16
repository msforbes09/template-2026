<?php

namespace App\Http\Controllers\Users;

use OpenApi\Attributes as OA;

/**
 * OpenAPI document root for the User API — password + OTP authentication.
 */
#[OA\Info(
    title: 'User API',
    version: '1.0.0',
    description: 'End-user endpoints — registration, authentication, profile, notifications.',
)]
#[OA\Server(url: L5_SWAGGER_CONST_HOST_LOCAL.'/user', description: 'Local / current environment')]
#[OA\Server(url: L5_SWAGGER_CONST_HOST_STAGING.'/user', description: 'Staging')]
#[OA\Server(url: L5_SWAGGER_CONST_HOST_PRODUCTION.'/user', description: 'Production')]
#[OA\SecurityScheme(securityScheme: 'bearerAuth', type: 'http', scheme: 'bearer')]
#[OA\Tag(name: 'Registration', description: 'Website self-registration (email OTP).')]
#[OA\Tag(name: 'Authentication', description: 'Password + OTP authentication (authenticate / two-factor / profile / logout).')]
#[OA\Tag(name: 'Profile', description: 'The authenticated user\'s own profile (view / update / complete / photo / delete).')]
#[OA\Tag(name: 'Password', description: 'Change / forgot / reset the account password.')]
#[OA\Tag(name: 'Notifications', description: "The authenticated user's in-app notification center (list / mark read).")]
#[OA\Schema(schema: 'ErrorEnvelope', type: 'object', properties: [
    new OA\Property(property: 'error', type: 'string', example: 'error'),
    new OA\Property(property: 'message', type: 'string', example: 'An error occurred.'),
    new OA\Property(property: 'error_description', type: 'string', example: 'An error occurred.'),
])]
#[OA\Schema(schema: 'ValidationError', type: 'object', properties: [
    new OA\Property(property: 'message', type: 'string', example: 'The exchange code field is required.'),
    new OA\Property(property: 'errors', type: 'object', example: ['exchange_code' => ['The exchange code field is required.']]),
])]
#[OA\Schema(schema: 'UnauthenticatedError', type: 'object', properties: [
    new OA\Property(property: 'error', type: 'string', example: 'unauthenticated'),
    new OA\Property(property: 'message', type: 'string', example: 'Unauthenticated.'),
    new OA\Property(property: 'error_description', type: 'string', example: 'Unauthenticated.'),
])]
#[OA\Schema(schema: 'NotFoundError', type: 'object', properties: [
    new OA\Property(property: 'error', type: 'string', example: 'data_not_found'),
    new OA\Property(property: 'message', type: 'string', example: 'Data record not found.'),
    new OA\Property(property: 'error_description', type: 'string', example: 'Data record not found.'),
])]
#[OA\Schema(schema: 'BadRequestError', type: 'object', properties: [
    new OA\Property(property: 'error', type: 'string', example: 'sso_authentication_failed'),
    new OA\Property(property: 'message', type: 'string', example: 'The request could not be processed.'),
    new OA\Property(property: 'error_description', type: 'string', example: 'The request could not be processed.'),
])]
#[OA\Schema(schema: 'TooManyRequestsError', type: 'object', properties: [
    new OA\Property(property: 'error', type: 'string', example: 'too_many_requests'),
    new OA\Property(property: 'message', type: 'string', example: 'Too many requests. Please slow down and try again shortly.'),
    new OA\Property(property: 'error_description', type: 'string', example: 'Too many requests. Please slow down and try again shortly.'),
])]
#[OA\Schema(schema: 'File', type: 'object', properties: [
    new OA\Property(property: 'uuid', type: 'string', example: '9e2be7f8-9853-43a2-8b8b-a216a3585951'),
    new OA\Property(property: 'url', type: 'string', nullable: true, description: 'Presigned URL on the private bucket', example: 'https://<account-id>.r2.cloudflarestorage.com/private-bucket/uploads/9f1c....jpg?X-Amz-Signature=...'),
    new OA\Property(property: 'original_name', type: 'string', nullable: true, example: 'photo.png'),
    new OA\Property(property: 'mime_type', type: 'string', nullable: true, example: 'image/png'),
    new OA\Property(property: 'size', type: 'integer', nullable: true, example: 20481),
])]
final class UsersApiDoc {}
