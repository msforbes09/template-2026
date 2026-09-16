<?php

use App\Exceptions\AccessDeniedHttpException;
use App\Exceptions\AuthenticationException;
use App\Exceptions\GeneralException;
use App\Exceptions\InsufficientPermissionException;
use App\Exceptions\ModelNotFoundException;
use App\Exceptions\NotFoundHttpException;
use App\Exceptions\QueryException;
use App\Exceptions\TooManyRequestsException;
use App\Http\Middleware\EnsureNotInMaintenance;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\LogPiiAccess;
use App\Http\Middleware\ProtectAdministrator;
use App\Http\Middleware\ProtectSuperAdminRole;
use App\Http\Middleware\RefreshAdministratorToken;
use App\Http\Middleware\RefreshUserToken;
use Illuminate\Auth\AuthenticationException as IlluminateAuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException as EloquentModelNotFoundException;
use Illuminate\Database\QueryException as DatabaseQueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\ItemNotFoundException;
use Laravel\Sanctum\Exceptions\MissingAbilityException;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException as SymfonyAccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException as SymfonyNotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        // No `health:` route. The framework's `/up` was unused — nothing referenced it
        // in compose, nginx, or any healthcheck — and an unauthenticated probe surface
        // that nothing depends on is a surface worth not having. `GET /` already
        // answers "is this service up, and which one is it".
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trusted proxies are NOT set here: Laravel's TrustProxies middleware
        // falls back to config/trustedproxy.php, which merges the baked-in hop
        // list (App\Http\TrustedProxies) with the per-environment TRUSTED_PROXIES
        // env — bootstrap runs before config is loaded, so it can't read that.

        $middleware->append([
            ForceJsonResponse::class,
        ]);

        // Default rate limit for the whole api group — a fail-safe backstop so every
        // /api/v1/* route is throttled by default (tight per-route limiters stack on
        // top). Prepended so a throttled request is rejected before any app work.
        $middleware->prependToGroup('api', 'throttle:api');

        $middleware->alias([
            'refresh.token' => RefreshAdministratorToken::class,
            'refresh.user.token' => RefreshUserToken::class,
            'maintenance' => EnsureNotInMaintenance::class,
            'password.changed' => EnsurePasswordChanged::class,
            'protect.administrator' => ProtectAdministrator::class,
            'log.pii-access' => LogPiiAccess::class,
            'protect.super-admin-role' => ProtectSuperAdminRole::class,
            'abilities' => CheckAbilities::class,
            'ability' => CheckForAnyAbility::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->renderable(function (MethodNotAllowedHttpException $e) {
            return (new NotFoundHttpException($e))->render();
        });

        $exceptions->renderable(function (SymfonyAccessDeniedHttpException $e) {
            if ($e->getPrevious() instanceof MissingAbilityException) {
                return (new InsufficientPermissionException)->render();
            }

            return (new AccessDeniedHttpException($e))->render();
        });

        $exceptions->renderable(function (ThrottleRequestsException $e) {
            return (new TooManyRequestsException)->render();
        });

        $exceptions->renderable(function (IlluminateAuthenticationException $e) {
            return (new AuthenticationException)->render();
        });

        $exceptions->renderable(function (ItemNotFoundException $e) {
            return (new ModelNotFoundException)->render();
        });

        $exceptions->renderable(function (SymfonyNotFoundHttpException $e) {
            if ($e->getPrevious() instanceof EloquentModelNotFoundException) {
                return (new ModelNotFoundException($e->getPrevious()))->render();
            }

            return (new NotFoundHttpException($e))->render();
        });

        $exceptions->renderable(function (DatabaseQueryException $e) {
            return (new QueryException($e))->render();
        });

        $exceptions->renderable(function (Throwable $e) {
            if (config('app.debug')) {
                return null;
            }

            // return (new GeneralException($e))->render();
        });
    })->create();
