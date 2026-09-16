<?php

declare(strict_types=1);

use App\Models\Notifications\Notification;
use Illuminate\Support\Str;
use OpenSearch\Adapter\Indices\Mapping;
use OpenSearch\Adapter\Indices\Settings;
use OpenSearch\Migrations\Facades\Index;
use OpenSearch\Migrations\MigrationInterface;

/**
 * The in-app notifications index — ONE plain, permanent index
 * (`{prefix}notifications`, prefixed by the migrations config), created
 * straight from the model's `searchableMapping()` so the mapping has a single
 * source of truth. No rollover alias and no ISM policy: retention is enforced
 * by `notifications:prune` (chunked model deletes, so Scout removes each
 * document). Applied at deploy by `php artisan opensearch:migrate`.
 */
final class CreateNotificationsIndex implements MigrationInterface
{
    /**
     * Run the migration.
     */
    public function up(): void
    {
        Index::create('notifications', function (Mapping $mapping, Settings $settings) {
            foreach (Notification::searchableMapping() as $field => $definition) {
                $type = $definition['type'];
                $parameters = array_diff_key($definition, ['type' => true]);

                // Mapping proxies `<type>($field, $parameters)` to the property builder.
                $mapping->{Str::camel($type)}($field, $parameters ?: null);
            }
        });
    }

    /**
     * Reverse the migration.
     */
    public function down(): void
    {
        Index::dropIfExists('notifications');
    }
}
