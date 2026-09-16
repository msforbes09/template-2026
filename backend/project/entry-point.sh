#!/bin/sh

composer dump-autoload

php artisan optimize

# OpenSearch is optional: only touch the cluster when the Scout driver points at it.
if [ "${SCOUT_DRIVER:-null}" = "opensearch" ]; then
    # Set up the OpenSearch log lifecycle — ISM policy, index templates, write aliases
    # (idempotent). Must run before workers index anything so the aliases exist. `|| true`
    # so an unreachable cluster never blocks the container from booting.
    php artisan opensearch:apply-lifecycle || true

    # Create the plain (non-lifecycle) OpenSearch indices — e.g. the users index — from
    # opensearch/migrations (idempotent; state kept in the opensearch_migrations table).
    # `|| true` for the same reason: never block boot on the cluster.
    php artisan opensearch:migrate --force || true
fi

pm2 start queue-workers.json

# Notify via the log pipeline (→ CloudWatch when enabled) that the container has
# booted. `|| true` so a logging hiccup never blocks the container from starting.
php artisan test:logger "Container started" --level=notice || true

php-fpm
