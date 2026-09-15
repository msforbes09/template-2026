<?php

namespace Database\Factories\Misc\Files;

use App\Enums\FileEnum;
use App\Models\Misc\Files\File;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<File>
 */
class FileFactory extends Factory
{
    /**
     * The model this factory builds.
     *
     * @var class-string<File>
     */
    protected $model = File::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $uuid = (string) Str::uuid();

        return [
            'uuid' => $uuid,
            'visibility' => FileEnum::VISIBILITY['PRIVATE'],
            'disk' => 's3',
            'folder_path' => 'uploads',
            'uploaded_name' => "{$uuid}.jpg",
            'original_name' => 'photo.jpg',
            'extension' => 'jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'status' => FileEnum::STATUS['UPLOADED'],
        ];
    }
}
