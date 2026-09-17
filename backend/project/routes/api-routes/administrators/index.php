<?php

use App\Enums\PermissionEnum;
use App\Http\Controllers\Administrators\Administrators\CreateAdministratorController;
use App\Http\Controllers\Administrators\Administrators\DeleteAdministratorController;
use App\Http\Controllers\Administrators\Administrators\ListAdministratorController;
use App\Http\Controllers\Administrators\Administrators\ResetAdministratorPasswordController;
use App\Http\Controllers\Administrators\Administrators\ShowAdministratorController;
use App\Http\Controllers\Administrators\Administrators\SyncAdministratorRolesController;
use App\Http\Controllers\Administrators\Administrators\ToggleAdministratorActiveStatusController;
use App\Http\Controllers\Administrators\Administrators\UpdateAdministratorController;
use App\Http\Controllers\Administrators\Authentication\AuthenticateController;
use App\Http\Controllers\Administrators\Authentication\ChangePasswordController;
use App\Http\Controllers\Administrators\Authentication\LogoutController;
use App\Http\Controllers\Administrators\Authentication\ProfileController;
use App\Http\Controllers\Administrators\Authentication\TwoFactorAuthenticateController;
use App\Http\Controllers\Administrators\Authentication\WaivePasswordExpiryController;
use App\Http\Controllers\Administrators\Broadcasting\BroadcastAuthController;
use App\Http\Controllers\Administrators\Broadcasts\DeleteBroadcastController;
use App\Http\Controllers\Administrators\Broadcasts\ListBroadcastController;
use App\Http\Controllers\Administrators\Broadcasts\StartBroadcastController;
use App\Http\Controllers\Administrators\Broadcasts\StoreBroadcastController;
use App\Http\Controllers\Administrators\Broadcasts\UpdateBroadcastController;
use App\Http\Controllers\Administrators\Contents\CreateContentController;
use App\Http\Controllers\Administrators\Contents\DeleteContentController;
use App\Http\Controllers\Administrators\Contents\ListContentController;
use App\Http\Controllers\Administrators\Contents\ShowContentController;
use App\Http\Controllers\Administrators\Contents\UpdateContentController;
use App\Http\Controllers\Administrators\Documentations\CreateDocumentationController;
use App\Http\Controllers\Administrators\Documentations\DeleteDocumentationController;
use App\Http\Controllers\Administrators\Documentations\ListDocumentationController;
use App\Http\Controllers\Administrators\Documentations\ShowDocumentationController;
use App\Http\Controllers\Administrators\Documentations\UpdateDocumentationController;
use App\Http\Controllers\Administrators\FeatureFlags\ListFeatureFlagsController;
use App\Http\Controllers\Administrators\FeatureFlags\UpdateFeatureFlagController;
use App\Http\Controllers\Administrators\Galleries\CreateGalleryController;
use App\Http\Controllers\Administrators\Galleries\DeleteGalleryController;
use App\Http\Controllers\Administrators\Galleries\ListGalleryController;
use App\Http\Controllers\Administrators\Horizon\CreateHorizonAccessController;
use App\Http\Controllers\Administrators\Logs\ListAuditLogController;
use App\Http\Controllers\Administrators\Logs\ListAuthAttemptLogController;
use App\Http\Controllers\Administrators\Logs\ListConnectionLogController;
use App\Http\Controllers\Administrators\Logs\ShowAuditLogController;
use App\Http\Controllers\Administrators\Logs\ShowAuthAttemptLogController;
use App\Http\Controllers\Administrators\Logs\ShowConnectionLogController;
use App\Http\Controllers\Administrators\Permissions\ListPermissionController;
use App\Http\Controllers\Administrators\Roles\CreateRoleController;
use App\Http\Controllers\Administrators\Roles\DeleteRoleController;
use App\Http\Controllers\Administrators\Roles\ListRoleController;
use App\Http\Controllers\Administrators\Roles\ShowRoleController;
use App\Http\Controllers\Administrators\Roles\SyncRolePermissionsController;
use App\Http\Controllers\Administrators\Roles\UpdateRoleController;
use App\Http\Controllers\Administrators\Users\ListUserController;
use App\Http\Controllers\Administrators\Users\ShowUserController;
use Illuminate\Support\Facades\Route;

Route::prefix('administrator')->group(function () {
    Route::post('authenticate', AuthenticateController::class)->middleware('throttle:authenticate');
    Route::post('two-factor-authenticate', TwoFactorAuthenticateController::class)
        ->middleware('throttle:two-factor');

    // Broadcasting auth for private admin channels (Echo authEndpoint). Only
    // `auth:administrators` — deliberately no `refresh.token`/`password.changed`
    // so a background WS re-auth never slides the inactivity timer or trips the
    // temp-password gate.
    Route::middleware(['auth:administrators', 'maintenance:admin'])
        ->post('broadcasting/auth', BroadcastAuthController::class);

    // `maintenance:admin` — while maintenance mode is on, the whole admin
    // surface answers 503 unless the authenticated administrator is flagged
    // is_developer. Logout is the sole exception so a locked-out admin can
    // still end their session.
    Route::middleware(['auth:administrators', 'refresh.token', 'maintenance:admin'])->group(function () {
        Route::get('profile', ProfileController::class);
        Route::post('change-password', ChangePasswordController::class);
        Route::post('password/waive-expiry', WaivePasswordExpiryController::class);
        Route::post('logout', LogoutController::class)->withoutMiddleware('maintenance:admin');

        // Administrators management — requires an authenticated admin whose
        // temporary password has been changed.
        Route::middleware('password.changed')->group(function () {
            Route::prefix('administrators')
                ->middleware('abilities:'.PermissionEnum::ADMINISTRATORS_VIEW)
                ->group(function () {
                    Route::get('/', ListAdministratorController::class);
                    // The show endpoint discloses the full record — that read is audited.
                    Route::get('{administrator}', ShowAdministratorController::class)->middleware('log.pii-access');

                    // `protect.administrator` — these endpoints manage *other* admins.
                    // Self-targeting is how a manager grants themselves Super Admin;
                    // targeting the super admin is how they swap its email and reset a
                    // password onto it. Manage your own account via profile/change-password.
                    Route::middleware(['abilities:'.PermissionEnum::ADMINISTRATORS_MANAGE, 'protect.administrator'])->group(function () {
                        Route::post('/', CreateAdministratorController::class);
                        Route::put('{administrator}', UpdateAdministratorController::class);
                        Route::post('{administrator}/toggle-active-status', ToggleAdministratorActiveStatusController::class);
                        Route::post('{administrator}/reset-password', ResetAdministratorPasswordController::class);
                        Route::post('{administrator}/sync-roles', SyncAdministratorRolesController::class);
                        Route::delete('{administrator}', DeleteAdministratorController::class);
                    });
                });

            Route::prefix('roles')->group(function () {
                Route::get('/', ListRoleController::class)
                    ->middleware('ability:'.PermissionEnum::ROLES_VIEW.','.PermissionEnum::ADMINISTRATORS_VIEW);

                Route::middleware('abilities:'.PermissionEnum::ROLES_VIEW)->group(function () {
                    Route::get('{role}', ShowRoleController::class);

                    // `protect.super-admin-role` — the Super Admin role is sealed over
                    // HTTP. Renaming it would defeat any name-based super-admin check;
                    // stripping its permissions would disarm whoever holds it.
                    Route::middleware(['abilities:'.PermissionEnum::ROLES_MANAGE, 'protect.super-admin-role'])->group(function () {
                        Route::post('/', CreateRoleController::class);
                        Route::put('{role}', UpdateRoleController::class);
                        Route::post('{role}/sync-permissions', SyncRolePermissionsController::class);
                        Route::delete('{role}', DeleteRoleController::class);
                    });
                });
            });

            Route::prefix('contents')->middleware('abilities:'.PermissionEnum::CONTENTS_VIEW)->group(function () {
                Route::get('/', ListContentController::class);
                Route::get('{content}', ShowContentController::class);

                Route::middleware('abilities:'.PermissionEnum::CONTENTS_MANAGE)->group(function () {
                    Route::post('/', CreateContentController::class);
                    Route::put('{content}', UpdateContentController::class);
                    Route::delete('{content}', DeleteContentController::class);
                });
            });

            Route::prefix('documentations')->middleware('abilities:'.PermissionEnum::DOCUMENTATIONS_VIEW)->group(function () {
                Route::get('/', ListDocumentationController::class);
                Route::get('{documentation}', ShowDocumentationController::class);

                Route::middleware('abilities:'.PermissionEnum::DOCUMENTATIONS_MANAGE)->group(function () {
                    Route::post('/', CreateDocumentationController::class);
                    Route::put('{documentation}', UpdateDocumentationController::class);
                    Route::delete('{documentation}', DeleteDocumentationController::class);
                });
            });

            // Admin broadcasts — announcements into the user notification center
            // (all registered users / filtered by status / a single uuid).
            Route::prefix('broadcasts')->middleware('abilities:'.PermissionEnum::NOTIFICATIONS_BROADCAST)->group(function () {
                Route::get('/', ListBroadcastController::class);
                Route::post('/', StoreBroadcastController::class);
                Route::put('{broadcast}', UpdateBroadcastController::class);
                Route::delete('{broadcast}', DeleteBroadcastController::class);
                Route::post('{broadcast}/start', StartBroadcastController::class);
            });

            // Runtime feature flags — list + toggle, gated ENTIRELY by the
            // developer-access VIRTUAL ability (granted at login to is_developer
            // admins only, never via roles or seeding) — feature flags are a
            // developer/ops concern, not a delegated admin task.
            // Developer-only: mint a signed link into the Horizon dashboard.
            Route::post('horizon/access', CreateHorizonAccessController::class)
                ->middleware('abilities:'.PermissionEnum::DEVELOPER_ACCESS);

            Route::prefix('feature-flags')->middleware('abilities:'.PermissionEnum::DEVELOPER_ACCESS)->group(function () {
                Route::get('/', ListFeatureFlagsController::class);
                Route::put('{name}', UpdateFeatureFlagController::class);
            });

            Route::prefix('users')->middleware('abilities:'.PermissionEnum::USERS_VIEW)->group(function () {
                // The list masks contact PII (UserListResource), so it is not audited.
                Route::get('/', ListUserController::class);

                // The show endpoint discloses the full record — that read is audited.
                Route::get('{user:uuid}', ShowUserController::class)->middleware('log.pii-access');

            });

            // Other operational logs (read-only) — list from OpenSearch (MySQL fallback),
            // detailed show from MySQL. Each gated by its own per-type permission.
            Route::prefix('connection-logs')->middleware('abilities:'.PermissionEnum::CONNECTION_LOGS_VIEW)->group(function () {
                Route::get('/', ListConnectionLogController::class);
                Route::get('{id}', ShowConnectionLogController::class)->where('id', '[0-9]+|[0-9]{4}_[0-9]{2}:[0-9]+');
            });

            Route::prefix('auth-attempt-logs')->middleware('abilities:'.PermissionEnum::AUTH_LOGS_VIEW)->group(function () {
                Route::get('/', ListAuthAttemptLogController::class);
                Route::get('{id}', ShowAuthAttemptLogController::class)->where('id', '[0-9]+|[0-9]{4}_[0-9]{2}:[0-9]+');
            });

            Route::prefix('audit-logs')->middleware('abilities:'.PermissionEnum::AUDIT_LOGS_VIEW)->group(function () {
                Route::get('/', ListAuditLogController::class);
                Route::get('{id}', ShowAuditLogController::class)->where('id', '[0-9]+|[0-9]{4}_[0-9]{2}:[0-9]+');
            });

            Route::prefix('galleries')->middleware('abilities:'.PermissionEnum::GALLERY_VIEW)->group(function () {
                Route::get('/', ListGalleryController::class);

                Route::middleware('abilities:'.PermissionEnum::GALLERY_MANAGE)->group(function () {
                    Route::post('/', CreateGalleryController::class);
                    Route::delete('{gallery:uuid}', DeleteGalleryController::class);
                });
            });

            Route::get('permissions', ListPermissionController::class)
                ->middleware('abilities:'.PermissionEnum::ROLES_VIEW);
        });
    });
});
