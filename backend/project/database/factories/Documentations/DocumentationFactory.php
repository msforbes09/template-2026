<?php

namespace Database\Factories\Documentations;

use App\Models\Documentations\Documentation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Documentation>
 */
class DocumentationFactory extends Factory
{
    /**
     * The model this factory builds.
     *
     * @var class-string<Documentation>
     */
    protected $model = Documentation::class;

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
