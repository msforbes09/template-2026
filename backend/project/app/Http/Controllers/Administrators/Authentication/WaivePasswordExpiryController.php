<?php

namespace App\Http\Controllers\Administrators\Authentication;

use App\Http\Controllers\Controller;
use App\Models\Administrators\Administrator;
use App\Models\Administrators\Resources\AdministratorProfileResource;
use OpenApi\Attributes as OA;

/**
 * Postpone the authenticated administrator's expired password once more.
 */
class WaivePasswordExpiryController extends Controller
{
    /**
     * Handle the request.
     */
    #[OA\Post(
        path: '/password/waive-expiry',
        summary: 'Postpone an expired password',
        description: 'Uses one of ADMIN_PASSWORD_EXPIRY_MAX_WAIVES postponements on an expired password: the expiry moves ADMIN_PASSWORD_EXPIRY_WAIVE_DAYS forward and the refreshed profile is returned. Refused when the password has not expired or no postponements remain; both reset on the next password change.',
        security: [['bearerAuth' => []]],
        tags: ['Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Postponed', content: new OA\JsonContent(
                properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Administrator')],
            )),
            new OA\Response(response: 400, description: 'Not expired, or no postponements left', content: new OA\JsonContent(ref: '#/components/schemas/BadRequestError', example: ['error' => 'password_expiry_waive_unavailable', 'message' => 'The password expiry cannot be postponed.', 'error_description' => 'The password expiry cannot be postponed.'])),
            new OA\Response(response: 401, description: 'Unauthenticated', content: new OA\JsonContent(ref: '#/components/schemas/UnauthenticatedError')),
        ],
    )]
    public function __invoke(): AdministratorProfileResource
    {
        $administrator = Administrator::authenticated();

        $administrator->waivePasswordExpiry();

        return AdministratorProfileResource::make($administrator);
    }
}
