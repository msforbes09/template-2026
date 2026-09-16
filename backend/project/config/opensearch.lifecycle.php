<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Log index lifecycle (ISM)
    |--------------------------------------------------------------------------
    |
    | A single shared ISM policy rolls each log index over (by age or size) and
    | deletes backing indices past the retention window — OpenSearch manages it,
    | no Laravel scheduler. Applied at deploy by `opensearch:apply-lifecycle`.
    | Retention is expressed in months but converted to days (ISM has no month
    | unit); 3 months => 91d. Older history stays in the monthly MySQL tables.
    |
    */

    'policy_id' => env('OPENSEARCH_LIFECYCLE_POLICY_ID', 'template_logs_policy'),

    'retention_months' => max(1, (int) env('OPENSEARCH_LOG_RETENTION_MONTHS', 3)),

    'rollover_age' => env('OPENSEARCH_LOG_ROLLOVER_AGE', '30d'),

    'rollover_size' => env('OPENSEARCH_LOG_ROLLOVER_SIZE', '25gb'),

    'number_of_shards' => (int) env('OPENSEARCH_LOG_SHARDS', 1),

    'number_of_replicas' => (int) env('OPENSEARCH_LOG_REPLICAS', 1),

];
