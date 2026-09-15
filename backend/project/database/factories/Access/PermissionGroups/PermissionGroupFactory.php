<?php

namespace Database\Factories\Access\PermissionGroups;

use App\Models\Access\PermissionGroups\PermissionGroup;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PermissionGroup>
 */
class PermissionGroupFactory extends Factory
{
    /**
     * The model the factory builds.
     *
     * @var class-string<PermissionGroup>
     */
    protected $model = PermissionGroup::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'description' => fake()->sentence(),
            'meta' => null,
        ];
    }
}
