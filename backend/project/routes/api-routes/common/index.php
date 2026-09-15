<?php

use App\Http\Controllers\Common\Addresses\ListBarangayController;
use App\Http\Controllers\Common\Addresses\ListCountryController;
use App\Http\Controllers\Common\Addresses\ListMunicipalityController;
use App\Http\Controllers\Common\Addresses\ListProvinceController;
use App\Http\Controllers\Common\Addresses\ListRegionController;
use App\Http\Controllers\Common\Contents\ListContentController;
use App\Http\Controllers\Common\Contents\ShowContentController;
use App\Http\Controllers\Common\FeatureFlags\ListPublicFeatureFlagsController;
use App\Http\Controllers\Common\Files\UploadPrivateFileController;
use App\Http\Controllers\Common\Files\UploadPublicFileController;
use App\Http\Controllers\Common\Galleries\ListGalleryController;
use App\Http\Controllers\Common\Otp\OtpResendController;
use Illuminate\Support\Facades\Route;

// All shared/common endpoints are prefixed with `common`.
Route::prefix('common')->group(function () {
    // Runtime feature flags — the UIs' public reference (maintenance banner).
    // Deliberately NOT behind the maintenance gate, so it stays readable while
    // maintenance mode is on.
    Route::get('feature-flags', ListPublicFeatureFlagsController::class);

    // OTP
    Route::post('otp/resend', OtpResendController::class)->middleware(['maintenance', 'throttle:otp-resend']);

    // File — open to both administrators and users (the uploader owns the File).
    // `password.changed` still gates admins on a temporary password (it no-ops for
    // users, who have no such state). The admin-only sliding-token refresh is omitted
    // here: it applies administrator token policy (incl. an absolute lifetime ceiling)
    // to whatever is authenticated, which must not be imposed on user tokens.
    // `throttle:upload-file` caps uploads per principal — a permission gate can't (the
    // route is shared with permission-less users), so this is what stops the endpoint
    // being used to exhaust storage.
    Route::middleware(['maintenance', 'auth:administrators,users', 'password.changed', 'throttle:upload-file'])->prefix('files')->group(function () {
        Route::post('public', UploadPublicFileController::class);
        Route::post('private', UploadPrivateFileController::class);
    });

    // Gallery (list for any authenticated admin — no permission gate)
    Route::middleware(['auth:administrators', 'refresh.token'])
        ->get('galleries', ListGalleryController::class);

    // Content
    Route::get('contents', ListContentController::class);
    Route::get('contents/{identifier}', ShowContentController::class);

    // Address reference data (PSGC + countries)
    Route::get('countries', ListCountryController::class);
    Route::get('regions', ListRegionController::class);
    Route::get('provinces', ListProvinceController::class);
    Route::get('municipalities', ListMunicipalityController::class);
    Route::get('barangays', ListBarangayController::class);
});
