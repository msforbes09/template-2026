<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles the application root endpoint — the service-status payload.
 *
 * The endpoint has a real operational job: hit a domain and confirm it answers with the
 * service you expected (that DNS points where you think it does), and confirm a deploy
 * actually shipped the version you intended. So it cannot simply be stripped.
 *
 * It is split instead. The identifying fields stay public — they *are* the domain check,
 * and they tell an attacker nothing. `environment` and `version` are returned only to a
 * caller presenting the status token: a confirmed environment and a version number are
 * reconnaissance the public has no need of.
 */
class HomeController extends Controller
{
    /**
     * Return the service status payload as JSON.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $timezone = config('app.timezone');

        $status = [
            'name' => config('app.name'),
            'service_name' => config('app.service_name'),
            'server_time' => now()->timezone($timezone)->format('Y-m-d H:i:s'),
            'timezone' => $timezone,
        ];

        if ($this->presentsStatusToken($request)) {
            $status['environment'] = config('app.env');
            $status['version'] = config('app.version');
        }

        return response()->json($status);
    }

    /**
     * Whether the caller presented the status token.
     *
     * Fails closed: with no token configured the detail is never exposed, so an
     * environment that forgot to set the secret cannot accidentally hand it to
     * everyone. Compared with `hash_equals`, so a wrong token cannot be narrowed down
     * by timing.
     */
    private function presentsStatusToken(Request $request): bool
    {
        $expected = (string) config('app.status_token');

        if ($expected === '') {
            return false;
        }

        return hash_equals($expected, (string) $request->header('X-Status-Token', ''));
    }
}
