<?php

namespace Database\Factories\Users;

use App\Enums\UserStatusEnum;
use App\Models\Users\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The model this factory builds.
     *
     * @var class-string<User>
     */
    protected $model = User::class;

    /**
     * Define the model's default state: a completed website account.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'first_name' => fake()->firstName(),
            'middle_name' => fake()->lastName(),
            'last_name' => fake()->lastName(),
            'suffix_name' => null,
            'company_name' => fake()->company(),
            'mobile_number' => '+639170000000',
            'birth_date' => fake()->date(),
            'gender' => fake()->randomElement(['male', 'female']),
            'citizenship_code' => 'PH',
            'is_active' => true,
            'status' => UserStatusEnum::COMPLETED->value,
            'registration_method' => 'website',
            'authentication_method' => 'website',
            'profile_completed_at' => now(),
        ];
    }

    /**
     * A freshly registered account that has not completed its profile yet.
     */
    public function draft(): static
    {
        return $this->state(fn () => ['status' => UserStatusEnum::DRAFT->value, 'profile_completed_at' => null]);
    }
}
