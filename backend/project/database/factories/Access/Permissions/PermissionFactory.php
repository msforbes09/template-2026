<?php

namespace Database\Factories\Access\Permissions;

use App\Models\Access\PermissionGroups\PermissionGroup;
use App\Models\Access\Permissions\Permission;
use App\Models\Administrators\Administrator;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Permission>
 */
class PermissionFactory extends Factory
{
    /**
     * The model the factory builds.
     *
     * @var class-string<Permission>
     */
    protected $model = Permission::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->slug(3),
            'guard_name' => Administrator::AUTH_GUARD,
            'group_id' => PermissionGroup::factory(),
        ];
    }
}
