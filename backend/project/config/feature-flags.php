<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Runtime Feature Flags
    |--------------------------------------------------------------------------
    |
    | The whitelisted registry of admin-manageable feature flags. Each entry
    | maps the flag name to the config key that supplies its value when no
    | runtime override has been stored (null = no fallback, defaults to off).
    |
    | Overrides live in the shared cache (see App\Services\FeatureFlags\
    | FeatureFlags), so one toggle applies across every instance without a
    | deploy. Caveat: flushing the cache reverts every flag to its fallback —
    | notably maintenance_mode fails OPEN (turns itself off).
    |
    */

    'flags' => [
        'maintenance_mode' => null,
    ],

];
