<?php

namespace Database\Factories\Access\Roles;

use App\Models\Access\Roles\Role;
use App\Models\Administrators\Administrator;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Role>
 */
class RoleFactory extends Factory
{
    /**
     * The model the factory builds.
     *
     * @var class-string<Role>
     */
    protected $model = Role::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'guard_name' => Administrator::AUTH_GUARD,
            'description' => fake()->sentence(),
            'meta' => null,
        ];
    }
}
