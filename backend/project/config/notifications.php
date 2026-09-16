<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Retention
    |--------------------------------------------------------------------------
    |
    | Months an in-app notification is kept before `notifications:prune` deletes
    | it (MySQL row + OpenSearch document alike). Clamped to at least one month
    | so a set-but-empty env can never become a delete-everything sweep.
    |
    */

    'retention_months' => max(1, (int) env('NOTIFICATION_RETENTION_MONTHS', 12)),

    /*
    |--------------------------------------------------------------------------
    | Welcome-back threshold
    |--------------------------------------------------------------------------
    |
    | Days since the previous login after which a returning user gets a
    | `welcome.back` notification instead of nothing.
    |
    */

    'welcome_back_days' => max(1, (int) env('NOTIFICATION_WELCOME_BACK_DAYS', 30)),

];
