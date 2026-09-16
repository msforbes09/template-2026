<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Log read path
    |--------------------------------------------------------------------------
    |
    | When enabled, log LIST endpoints query OpenSearch (spanning months, richer
    | filters) and fall back to the MySQL monthly tables if OpenSearch is
    | unavailable. Disabled in the test suite (no cluster) so lists read MySQL
    | directly. Detail (show) always reads MySQL.
    |
    */

    'enabled' => (bool) env('OPENSEARCH_READ_ENABLED', true),

];
