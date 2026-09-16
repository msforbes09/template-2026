<?php

namespace App\Providers;

use Illuminate\Http\Request;
use Laravel\Horizon\Horizon;
use Laravel\Horizon\HorizonApplicationServiceProvider;

/**
 * Gates the Horizon dashboard. Administrators authenticate with bearer tokens
 * from a separate origin, so a browser page cannot be protected by the API's
 * guards; instead the admin console mints a signed handoff link
 * (CreateHorizonAccessController) that marks the session as authorised
 * (HorizonAccessController). The local environment stays open for convenience.
 */
class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    /**
     * Session key stamped by a followed handoff link.
     */
    public const SESSION_KEY = 'horizon_authorised_at';

    /**
     * Allow the dashboard in local, or for a session that followed a signed handoff.
     */
    protected function authorization(): void
    {
        Horizon::auth(function (Request $request): bool {
            return $this->app->environment('local')
                || $request->session()->has(self::SESSION_KEY);
        });
    }
}
