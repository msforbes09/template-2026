<?php

use App\Models\Administrators\Administrator;
use App\Models\Users\User;

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Defaults
    |--------------------------------------------------------------------------
    |
    | This option defines the default authentication "guard" and password
    | reset "broker" for your application. You may change these values
    | as required, but they're a perfect start for most applications.
    |
    */

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),
        'passwords' => env('AUTH_PASSWORD_BROKER', 'users'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Authentication Guards
    |--------------------------------------------------------------------------
    |
    | Next, you may define every authentication guard for your application.
    | Of course, a great default configuration has been defined for you
    | which utilizes session storage plus the Eloquent user provider.
    |
    | All authentication guards have a user provider, which defines how the
    | users are actually retrieved out of your database or other storage
    | system used by the application. Typically, Eloquent is utilized.
    |
    | Supported: "session"
    |
    */

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],

        'administrators' => [
            'driver' => 'sanctum',
            'provider' => 'administrators',
        ],

        'users' => [
            'driver' => 'sanctum',
            'provider' => 'users',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Providers
    |--------------------------------------------------------------------------
    |
    | All authentication guards have a user provider, which defines how the
    | users are actually retrieved out of your database or other storage
    | system used by the application. Typically, Eloquent is utilized.
    |
    | If you have multiple user tables or models you may configure multiple
    | providers to represent the model / table. These providers may then
    | be assigned to any extra authentication guards you have defined.
    |
    | Supported: "database", "eloquent"
    |
    */

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => User::class,
        ],

        'administrators' => [
            'driver' => 'eloquent',
            'model' => Administrator::class,
        ],

        // 'users' => [
        //     'driver' => 'database',
        //     'table' => 'users',
        // ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Resetting Passwords
    |--------------------------------------------------------------------------
    |
    | These configuration options specify the behavior of Laravel's password
    | reset functionality, including the table utilized for token storage
    | and the user provider that is invoked to actually retrieve users.
    |
    | The expiry time is the number of minutes that each reset token will be
    | considered valid. This security feature keeps tokens short-lived so
    | they have less time to be guessed. You may change this as needed.
    |
    | The throttle setting is the number of seconds a user must wait before
    | generating more password reset tokens. This prevents the user from
    | quickly generating a very large amount of password reset tokens.
    |
    */

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Confirmation Timeout
    |--------------------------------------------------------------------------
    |
    | Here you may define the number of seconds before a password confirmation
    | window expires and users are asked to re-enter their password via the
    | confirmation screen. By default, the timeout lasts for three hours.
    |
    */

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

    /*
    |--------------------------------------------------------------------------
    | Default Super Administrator
    |--------------------------------------------------------------------------
    |
    | Credentials for the super administrator seeded by AccessSeeder. Keep the
    | password in the environment file — never commit it to version control.
    |
    */

    'super_admin' => [
        // No default. A shipped default address is a known account to attack — an
        // attacker who need not guess the email is halfway in. When unset, AccessSeeder
        // still seeds the permission catalog + Super Admin ROLE but SKIPS creating the
        // super-administrator ACCOUNT (so a permission reseed never depends on these
        // envs); create the account later by setting them and re-seeding (F32).
        'email' => env('SUPER_ADMIN_EMAIL'),
        'password' => env('SUPER_ADMIN_PASSWORD'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Administrator Tokens
    |--------------------------------------------------------------------------
    |
    | Administrator bearer tokens expire after this many minutes of inactivity
    | (a sliding window refreshed on each authenticated request).
    |
    */

    'password_policy' => [
        // Block reuse of the last N passwords, the current one included. 0 disables.
        'history_limit' => (int) env('PASSWORD_HISTORY_LIMIT', 5),

        // Hours a password must be held before it may be changed voluntarily; resets
        // and forced changes are exempt. 0 disables.
        'min_age_hours' => (int) env('PASSWORD_MIN_AGE_HOURS', 24),
    ],

    'administrators' => [
        'token_inactivity_minutes' => (int) env('ADMIN_TOKEN_INACTIVITY_MINUTES', 60),

        // Hard ceiling on a token's life, measured from issue and never extended.
        // The inactivity window above slides on every request, so without this a
        // token that keeps being used never expires at all.
        'token_absolute_minutes' => (int) env('ADMIN_TOKEN_ABSOLUTE_MINUTES', 480),
        'two_factor' => [
            'enabled' => (bool) env('ADMIN_2FA_ENABLED', true),
            'trust_window' => (int) env('ADMIN_2FA_TRUST_WINDOW', 43200),
            'auth_token_ttl' => (int) env('ADMIN_2FA_AUTH_TOKEN_TTL', 2100),     // 35 min
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Tokens
    |--------------------------------------------------------------------------
    |
    | User (user) bearer tokens expire after this many minutes of inactivity
    | (a sliding window refreshed on each authenticated request).
    |
    */

    'users' => [
        'token_inactivity_minutes' => (int) env('USER_TOKEN_INACTIVITY_MINUTES', 60),
        'token_absolute_minutes' => (int) env('USER_TOKEN_ABSOLUTE_MINUTES', 1440),
        'two_factor' => [
            'enabled' => (bool) env('USER_2FA_ENABLED', true),
            'trust_window' => (int) env('USER_2FA_TRUST_WINDOW', 43200),          // 12h
            'max_trusted_devices' => (int) env('USER_2FA_MAX_TRUSTED_DEVICES', 5),
            'auth_token_ttl' => (int) env('USER_2FA_AUTH_TOKEN_TTL', 2100),       // 35 min
        ],
    ],

];
