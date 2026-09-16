<?php

use App\Http\Controllers\DocumentationIndexController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\HorizonAccessController;
use App\Http\Middleware\EnsureDocumentationEnabled;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class);

// The docs landing page is hidden wherever the docs themselves are — otherwise it would
// still advertise which API groups exist, and link to them.
Route::get('api/documentation', DocumentationIndexController::class)
    ->middleware(EnsureDocumentationEnabled::class);

// Signed handoff into the Horizon dashboard (see HorizonServiceProvider). Sits
// outside Horizon's own `/horizon/{view}` catch-all but under the `/horizon`
// prefix nginx routes to the dashboard port. Relative signature: minted on the
// API host, validated on the dashboard host.
Route::get('horizon-access', HorizonAccessController::class)
    ->middleware('signed:relative')
    ->name('horizon.access');
