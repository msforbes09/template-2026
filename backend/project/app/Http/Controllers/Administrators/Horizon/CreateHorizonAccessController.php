<?php

namespace App\Http\Controllers\Administrators\Horizon;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\URL;
use OpenApi\Attributes as OA;

/**
 * Mints a short-lived signed link into the Horizon dashboard for a developer
 * administrator. The link is relative-signed so it validates on the dashboard
 * origin (its own port or subdomain) even though it is minted on the API host.
 */
class CreateHorizonAccessController extends Controller
{
    /**
     * Seconds a minted link stays valid.
     */
    private const TTL_SECONDS = 60;

    #[OA\Post(
        path: '/horizon/access',
        summary: 'Mint a signed link into the Horizon dashboard',
        description: 'Requires the `developer-access` login-time ability. Returns a one-minute signed URL on the dashboard origin (`HORIZON_URL`); opening it authorises the browser session for the dashboard and redirects to `/horizon`.',
        security: [['bearerAuth' => []]],
        tags: ['Horizon'],
        responses: [
            new OA\Response(response: 200, description: 'Signed dashboard link', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'object', properties: [
                    new OA\Property(property: 'url', type: 'string', example: 'https://horizon.example.com/horizon-access?expires=1789000000&signature=ab12…'),
                    new OA\Property(property: 'expires_at', type: 'string', example: '2026-09-16 13:01:00'),
                ]),
            ])),
            new OA\Response(response: 403, description: 'Forbidden', content: new OA\JsonContent(ref: '#/components/schemas/ForbiddenError')),
        ],
    )]
    public function __invoke(): JsonResponse
    {
        $expiresAt = now()->addSeconds(self::TTL_SECONDS);
        $relative = URL::temporarySignedRoute('horizon.access', $expiresAt, [], false);

        return response()->json([
            'data' => [
                'url' => rtrim(config('horizon.dashboard_url'), '/').$relative,
                'expires_at' => $expiresAt->format('Y-m-d H:i:s'),
            ],
        ]);
    }
}
