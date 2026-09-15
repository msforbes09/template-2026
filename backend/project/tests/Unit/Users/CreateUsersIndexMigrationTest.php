<?php

namespace Tests\Unit\Users;

use App\Models\Users\User;
use OpenSearch\Adapter\Indices\Mapping;
use OpenSearch\Adapter\Indices\Settings;
use OpenSearch\Migrations\Facades\Index;
use Tests\TestCase;

/**
 * The users OpenSearch migration creates the (prefixed) `users` index with exactly
 * the model's `searchableMapping()`, and drops it on rollback — a plain, permanent
 * index outside the log lifecycle.
 */
class CreateUsersIndexMigrationTest extends TestCase
{
    /**
     * Load the migration class from the opensearch/migrations directory.
     */
    private function migration(): object
    {
        $files = glob(base_path('opensearch/migrations/*_create_users_index.php'));
        $this->assertCount(1, $files, 'expected exactly one create_users_index migration');
        require_once $files[0];

        return new \CreateUsersIndex;
    }

    /**
     * up() creates `users` (the package adds the template_ prefix) with the
     * model mapping.
     */
    public function test_up_creates_the_index_with_the_model_mapping(): void
    {
        $captured = null;
        Index::shouldReceive('create')->once()->withArgs(function (string $name, callable $callback) use (&$captured) {
            $captured = $callback;

            return $name === 'users';
        });

        $this->migration()->up();

        $mapping = new Mapping;
        $captured($mapping, new Settings);

        $this->assertSame(User::searchableMapping(), $mapping->toArray()['properties']);
    }

    /**
     * down() drops the index.
     */
    public function test_down_drops_the_index(): void
    {
        Index::shouldReceive('drop')->once()->with('users');

        $this->migration()->down();
    }
}
