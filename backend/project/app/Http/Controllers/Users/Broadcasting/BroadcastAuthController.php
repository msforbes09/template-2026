<?php

namespace App\Http\Controllers\Users\Broadcasting;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;

/**
 * Authorize a user's subscription to a private broadcast channel.
 *
 * Consumed by the frontend Echo client as its `authEndpoint`. Guarded by the
 * `users` Sanctum guard; returns the signed Reverb/Pusher auth payload for the
 * requested channel (e.g. `private-user.{uuid}`). Deliberately not behind
 * `refresh.user.token` so a background WS re-auth never slides the inactivity timer.
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
