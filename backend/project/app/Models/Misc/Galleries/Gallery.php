<?php

namespace App\Models\Misc\Galleries;

use App\Enums\FileEnum;
use App\Models\Misc\Files\File;
use Database\Factories\Misc\Galleries\GalleryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * A public gallery image stored on the public R2 bucket. Public-only —
 * url() is the permanent (unsigned) URL on the public R2 bucket's custom domain.
 */
class Gallery extends Model implements Auditable
{
    use AuditableTrait;

    /** @use HasFactory<GalleryFactory> */
    use HasFactory;

    /**
     * The storage disk galleries live on.
     */
    public const DISK = File::PUBLIC_DISK;

    /**
     * The public folder galleries are stored under.
     */
    public const FOLDER = 'gallery';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'uuid', 'folder_path', 'uploaded_name', 'original_name',
        'extension', 'mime_type', 'size', 'status', 'meta', 'error',
    ];

    /**
     * Get the attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    /**
     * Remove the stored object when the record is deleted.
     */
    protected static function booted(): void
    {
        static::deleting(function (Gallery $gallery) {
            Storage::disk(self::DISK)->delete("{$gallery->folder_path}/{$gallery->uploaded_name}");
        });
    }

    /**
     * Stream an uploaded image to the public gallery folder and record it.
     */
    public static function upload(UploadedFile $file): static
    {
        $gallery = new static;
        $gallery->uuid = (string) Str::uuid();
        $gallery->original_name = $file->getClientOriginalName();
        $gallery->extension = $file->getClientOriginalExtension();
        $gallery->mime_type = $file->getClientMimeType();
        $gallery->size = $file->getSize();
        $gallery->uploaded_name = "{$gallery->uuid}.{$gallery->extension}";
        $gallery->folder_path = self::FOLDER;
        $gallery->status = FileEnum::STATUS['DRAFT'];

        try {
            Storage::disk(self::DISK)->putFileAs($gallery->folder_path, $file, $gallery->uploaded_name);
            $gallery->status = FileEnum::STATUS['UPLOADED'];
        } catch (\Throwable $e) {
            $gallery->status = FileEnum::STATUS['FAILED'];
            $gallery->error = $e->getMessage();
        }

        $gallery->save();

        return $gallery;
    }

    /**
     * The permanent, unsigned public-bucket URL — null until the upload succeeded.
     */
    public function url(): ?string
    {
        if ($this->status !== FileEnum::STATUS['UPLOADED']) {
            return null;
        }

        return File::publicBaseUrl()."/{$this->folder_path}/{$this->uploaded_name}";
    }
}
