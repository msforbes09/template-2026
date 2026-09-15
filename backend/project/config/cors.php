<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS) Configuration
|--------------------------------------------------------------------------
|
| The HandleCors middleware validates the request Origin against the exact
| allowlist below and only reflects an allowed origin back in
| Access-Control-Allow-Origin. `allowed_origins` defaults to local dev
| origins; production MUST set CORS_ALLOWED_ORIGINS to the real frontend
| host(s) (comma-separated exact origins). No wildcard patterns are used.
|
*/

return [

    'paths' => ['api/*', 'broadcasting/auth', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', implode(',', [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:8080',
        ]))),
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => (int) env('CORS_MAX_AGE', 0),

    // Bearer-token (Sanctum) API — the browser sends Authorization headers, not
    // cookies — so cross-origin credentials are not permitted.
    'supports_credentials' => false,

];
