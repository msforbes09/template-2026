<?php

namespace App\Http\Controllers\Administrators\Broadcasting;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;

/**
 * Authorize an administrator's subscription to a private broadcast channel.
 *
 * Consumed by the frontend Echo client as its `authEndpoint`. Guarded by the
 * `administrators` Sanctum guard; returns the signed Reverb/Pusher auth payload
 * for the requested channel (e.g. `private-administrators`).
 */
class BroadcastAuthController extends Controller
{
    /**
     * Handle the request.
     */
    public function __invoke(Request $request): mixed
    {
        return Broadcast::auth($request);
    }
}
