<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Application Name
    |--------------------------------------------------------------------------
    |
    | This value is the name of your application, which will be used when the
    | framework needs to place the application's name in a notification or
    | other UI elements where an application name needs to be displayed.
    |
    */

    'name' => env('APP_NAME', 'Laravel'),

    /*
    |--------------------------------------------------------------------------
    | Service Name & Version
    |--------------------------------------------------------------------------
    |
    | Identifiers for this service surfaced on the root status endpoint.
    | Set these in your ".env" file per deployment.
    |
    */

    'service_name' => env('APP_SERVICE_NAME', 'WS'),

    'version' => env('APP_VERSION', 'v1.2.0'),

    /*
    |--------------------------------------------------------------------------
    | Status Token
    |--------------------------------------------------------------------------
    |
    | Presented as `X-Status-Token` to make `GET /` reveal the environment and the
    | deployed version — the deploy check. Without it those fields are withheld, so
    | the public sees only enough to confirm which service answers the domain.
    |
    | Unset means the detail is never exposed. An absent secret fails closed.
    |
    */

    'status_token' => env('APP_STATUS_TOKEN'),

    /*
    |--------------------------------------------------------------------------
    | API Documentation UI
    |--------------------------------------------------------------------------
    |
    | Whether the Swagger UI and its JSON are reachable. Off in production unless
    | DOCS_ENABLED explicitly says otherwise — the docs enumerate every endpoint,
    | parameter and error shape, which is a map an attacker would otherwise have to
    | draw themselves.
    |
    | It cannot be put behind `auth:administrators` instead: Swagger UI is a browser
    | page, and a browser cannot present a Sanctum bearer token.
    |
    */

    'docs_enabled' => (bool) env('DOCS_ENABLED', env('APP_ENV') !== 'production'),

    /*
    |--------------------------------------------------------------------------
    | Application Environment
    |--------------------------------------------------------------------------
    |
    | This value determines the "environment" your application is currently
    | running in. This may determine how you prefer to configure various
    | services the application utilizes. Set this in your ".env" file.
    |
    */

    'env' => env('APP_ENV', 'production'),

    /*
    |--------------------------------------------------------------------------
    | Application Debug Mode
    |--------------------------------------------------------------------------
    |
    | When your application is in debug mode, detailed error messages with
    | stack traces will be shown on every error that occurs within your
    | application. If disabled, a simple generic error page is shown.
    |
    */

    'debug' => (bool) env('APP_DEBUG', false),

    /*
    |--------------------------------------------------------------------------
    | Application URL
    |--------------------------------------------------------------------------
    |
    | This URL is used by the console to properly generate URLs when using
    | the Artisan command line tool. You should set this to the root of
    | the application so that it's available within Artisan commands.
    |
    */

    'url' => env('APP_URL', 'http://localhost'),

    /*
    |--------------------------------------------------------------------------
    | Application Timezone
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default timezone for your application, which
    | will be used by the PHP date and date-time functions. The timezone
    | is set to "UTC" by default as it is suitable for most use cases.
    |
    */

    'timezone' => 'Asia/Manila',

    /*
    |--------------------------------------------------------------------------
    | Application Locale Configuration
    |--------------------------------------------------------------------------
    |
    | The application locale determines the default locale that will be used
    | by Laravel's translation / localization methods. This option can be
    | set to any locale for which you plan to have translation strings.
    |
    */

    'locale' => env('APP_LOCALE', 'en'),

    'fallback_locale' => env('APP_FALLBACK_LOCALE', 'en'),

    'faker_locale' => env('APP_FAKER_LOCALE', 'en_US'),

    /*
    |--------------------------------------------------------------------------
    | Encryption Key
    |--------------------------------------------------------------------------
    |
    | This key is utilized by Laravel's encryption services and should be set
    | to a random, 32 character string to ensure that all encrypted values
    | are secure. You should do this prior to deploying the application.
    |
    */

    'cipher' => 'AES-256-CBC',

    'key' => env('APP_KEY'),

    'previous_keys' => [
        ...array_filter(
            explode(',', (string) env('APP_PREVIOUS_KEYS', ''))
        ),
    ],

    // Key for encrypting user PII (the `ciphertext` blob) and deriving the
    // `*_hash` blind indexes. Separate from APP_KEY so it can be rotated
    // independently; `?:` so an empty value falls back to APP_KEY.
    'pii_key' => env('PII_ENCRYPTION_KEY') ?: env('APP_KEY'),

    // The dedicated PII key ALONE, with no APP_KEY fallback. Read from config (not
    // env()) so it survives `config:cache` — the boot guard uses it to tell whether
    // a dedicated key was actually set in production. See PiiKeyGuard.
    'pii_key_explicit' => env('PII_ENCRYPTION_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Maintenance Mode Driver
    |--------------------------------------------------------------------------
    |
    | These configuration options determine the driver used to determine and
    | manage Laravel's "maintenance mode" status. The "cache" driver will
    | allow maintenance mode to be controlled across multiple machines.
    |
    | Supported drivers: "file", "cache"
    |
    */

    'maintenance' => [
        'driver' => env('APP_MAINTENANCE_DRIVER', 'file'),
        'store' => env('APP_MAINTENANCE_STORE', 'database'),
    ],

];
