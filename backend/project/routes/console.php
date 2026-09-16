<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// All scheduled tasks use ->onOneServer() so they run on exactly ONE instance
// per due time in multi-instance environments (prod). This requires a SHARED,
// lock-capable cache store across instances — CACHE_STORE=redis, or =database
// (the shared app DB; needs the `cache`/`cache_locks` tables). A per-server
// `file`/`array` cache does NOT coordinate across instances.

// Prune expired, unlocked one-time PINs (and any other Prunable models) daily.
Schedule::command('model:prune')->daily()->onOneServer();

// Horizon's throughput / wait-time graphs are built from these snapshots.
Schedule::command('horizon:snapshot')->everyFiveMinutes()->onOneServer();

// Prune failed queue jobs after a week — failed payloads can reference user
// data (even encrypted ones don't belong in `failed_jobs` indefinitely).
Schedule::command('queue:prune-failed', ['--hours' => 168])->daily()->onOneServer();

// Pre-create next month's audit table before the month rolls over.
Schedule::command('audit:prepare-next-table')->lastDayOfMonth('23:50')->onOneServer();

// Pre-create next month's connection (outbound-call) log table.
Schedule::command('connection:prepare-next-table')->lastDayOfMonth('23:50')->onOneServer();

// Refresh the cached disposable-email domain blocklist.
Schedule::command('email:cache-disposable-domains')->weekly()->onOneServer();

// Auto-prune the in-app notification center past its retention window
// (NOTIFICATION_RETENTION_MONTHS, default 12) — both MySQL and OpenSearch.
Schedule::command('notifications:prune')->daily()->onOneServer()->runInBackground();
