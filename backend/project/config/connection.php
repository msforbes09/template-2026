<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Connection log database
    |--------------------------------------------------------------------------
    |
    | The database connection outbound-call logs are written to. Defaults to the
    | shared `mysql-logs` connection (see config/database.php). In testing this
    | is pointed at the default in-memory connection.
    |
    */
    'log_connection' => env('CONNECTION_LOG_CONNECTION', 'mysql-logs'),

    /*
    |--------------------------------------------------------------------------
    | Disposable email blocklist
    |--------------------------------------------------------------------------
    |
    | A newline-delimited domain blocklist is fetched from `access_url` by the
    | `email:cache-disposable-domains` command and cached; the NoDisposableEmail
    | rule checks against that cache (no network call at validation time).
    |
    */
    'disposable_emails' => [
        'enabled' => (bool) env('DISPOSABLE_EMAIL_ENABLED', true),
        'access_url' => env('DISPOSABLE_EMAILS_URL', 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf'),
    ],

];
