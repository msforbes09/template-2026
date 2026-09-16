<?php

use App\Http\Controllers\Users\Authentication\AuthenticateController;
use App\Http\Controllers\Users\Authentication\LogoutController;
use App\Http\Controllers\Users\Authentication\ProfileController;
use App\Http\Controllers\Users\Authentication\TwoFactorAuthenticateController;
use App\Http\Controllers\Users\Broadcasting\BroadcastAuthController;
use App\Http\Controllers\Users\Notifications\ListNotificationsController;
use App\Http\Controllers\Users\Notifications\MarkAllNotificationsReadController;
use App\Http\Controllers\Users\Notifications\MarkNotificationReadController;
use App\Http\Controllers\Users\Password\ChangePasswordController;
use App\Http\Controllers\Users\Password\ForgotPasswordController;
use App\Http\Controllers\Users\Password\ResetPasswordController;
use App\Http\Controllers\Users\Profile\CompleteProfileController;
use App\Http\Controllers\Users\Profile\DeleteProfileController;
use App\Http\Controllers\Users\Profile\UpdateProfileController;
use App\Http\Controllers\Users\Profile\UpdateProfilePhotoController;
use App\Http\Controllers\Users\Registration\RegisterController;
use App\Http\Controllers\Users\Registration\VerifyRegistrationController;
use Illuminate\Support\Facades\Route;

// End-user endpoints on the `users` guard. The whole surface (login/registration
// included) is behind the maintenance gate: while the `maintenance_mode` runtime
// flag is on, every route here answers 503 service_unavailable.
Route::prefix('user')->middleware('maintenance')->group(function () {
    // Public website registration (email OTP, verify-before-create).
    // The OTP is resent via the shared POST api/v1/common/otp/resend endpoint.
    Route::post('register', RegisterController::class)->middleware('throttle:register');
    Route::post('verify-registration', VerifyRegistrationController::class)->middleware('throttle:verify-registration');

    // Public native login (identifier + password + OTP 2FA).
    Route::post('authenticate', AuthenticateController::class)->middleware('throttle:user-authenticate');
    Route::post('two-factor-authenticate', TwoFactorAuthenticateController::class)->middleware('throttle:user-two-factor');

    // Public password reset (OTP; resend via common/otp/resend).
    Route::post('forgot-password', ForgotPasswordController::class)->middleware('throttle:user-forgot-password');
    Route::post('reset-password', ResetPasswordController::class)->middleware('throttle:user-reset-password');

    // Broadcasting auth for the user's private channels (Echo authEndpoint).
    // Only `auth:users` — no refresh.user.token, so a background WS re-auth never
    // slides the inactivity timer.
    Route::middleware('auth:users')->post('broadcasting/auth', BroadcastAuthController::class);

    Route::middleware(['auth:users', 'refresh.user.token'])->group(function () {
        Route::get('profile', ProfileController::class);
        Route::put('profile', UpdateProfileController::class);
        Route::patch('profile/photo', UpdateProfilePhotoController::class);
        Route::delete('profile', DeleteProfileController::class)->middleware('throttle:user-delete-account');
        Route::post('profile/complete', CompleteProfileController::class)->middleware('throttle:complete-profile');
        Route::post('change-password', ChangePasswordController::class)->middleware('throttle:user-change-password');

        Route::post('logout', LogoutController::class);

        // The in-app notification center (bell): own-scoped list + mark-read.
        Route::get('notifications', ListNotificationsController::class);
        Route::post('notifications/read-all', MarkAllNotificationsReadController::class);
        Route::post('notifications/{id}/read', MarkNotificationReadController::class)->where('id', '[0-9]+');
    });
});
