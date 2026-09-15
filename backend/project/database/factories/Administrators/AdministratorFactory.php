<?php

namespace Database\Factories\Administrators;

use App\Models\Administrators\Administrator;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Administrator>
 */
class AdministratorFactory extends Factory
{
    /**
     * The model the factory builds.
     *
     * @var class-string<Administrator>
     */
    protected $model = Administrator::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'photo_uuid' => null,
            'password' => 'password',
            'with_temporary_password' => true,
            'is_active' => true,
            'is_developer' => false,
        ];
    }
}
