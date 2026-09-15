<?php

namespace Database\Factories\Misc\Otps;

use App\Models\Misc\Otps\Otp;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<Otp>
 */
class OtpFactory extends Factory
{
    /**
     * The model the factory builds.
     *
     * @var class-string<Otp>
     */
    protected $model = Otp::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => 'test',
            'identifier' => fake()->unique()->safeEmail(),
            'hashed_pin' => Hash::make('123456'),
            'resend_token' => hash('sha256', Str::random(64)),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'resend_count' => 0,
            'locked_until' => null,
        ];
    }
}
