<?php

namespace App\Http\Controllers;

use App\Providers\HorizonServiceProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Lands a signed handoff link: marks the browser session as authorised for the
 * Horizon dashboard and sends it there. The `signed:relative` middleware on the
 * route has already rejected anything unsigned, expired or tampered.
 */
class HorizonAccessController extends Controller
{
    /**
     * Stamp the session and redirect to the dashboard.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $request->session()->put(HorizonServiceProvider::SESSION_KEY, now()->format('Y-m-d H:i:s'));

        return redirect('/'.config('horizon.path'));
    }
}
