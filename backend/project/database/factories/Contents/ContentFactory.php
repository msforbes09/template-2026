<?php

namespace Database\Factories\Contents;

use App\Models\Contents\Content;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Content>
 */
class ContentFactory extends Factory
{
    /**
     * The model this factory builds.
     *
     * @var class-string<Content>
     */
    protected $model = Content::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'identifier' => fake()->unique()->slug(),
            'body' => ['en' => fake()->paragraph()],
            'meta' => ['title' => fake()->sentence()],
        ];
    }
}
