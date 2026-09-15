<?php

declare(strict_types=1);

use App\Models\Users\User;
use Illuminate\Support\Str;
use OpenSearch\Adapter\Indices\Mapping;
use OpenSearch\Adapter\Indices\Settings;
use OpenSearch\Migrations\Facades\Index;
use OpenSearch\Migrations\MigrationInterface;

/**
 * The users index — ONE plain, permanent index (`{prefix}users`, prefixed
 * by the migrations config), created straight from the model's
 * `searchableMapping()` so the mapping has a single source of truth. No rollover
 * alias and no ISM policy: users are not time-series logs and are never purged.
 * Applied at deploy by `php artisan opensearch:migrate`.
 */
final class CreateUsersIndex implements MigrationInterface
{
    /**
     * Run the migration.
     */
    public function up(): void
    {
        Index::create('users', function (Mapping $mapping, Settings $settings) {
            foreach (User::searchableMapping() as $field => $definition) {
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
        Index::drop('users');
    }
}
