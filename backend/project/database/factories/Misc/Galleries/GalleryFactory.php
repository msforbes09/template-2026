<?php

namespace Database\Factories\Misc\Galleries;

use App\Enums\FileEnum;
use App\Models\Misc\Galleries\Gallery;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Gallery>
 */
class GalleryFactory extends Factory
{
    /**
     * The model the factory builds.
     *
     * @var class-string<Gallery>
     */
    protected $model = Gallery::class;

    /**
     * Define the model's default state (an uploaded public image).
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $uuid = (string) Str::uuid();

        return [
            'uuid' => $uuid,
            'folder_path' => Gallery::FOLDER,
            'uploaded_name' => "{$uuid}.jpg",
            'original_name' => 'image.jpg',
            'extension' => 'jpg',
            'mime_type' => 'image/jpeg',
            'size' => 12345,
            'status' => FileEnum::STATUS['UPLOADED'],
            'meta' => null,
        ];
    }
}
