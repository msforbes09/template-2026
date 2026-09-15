<?php

namespace App\Models\Misc\Files;

use App\Enums\FileEnum;
use App\Services\Files\CloudFrontSigner;
use Database\Factories\Misc\Files\FileFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * An uploaded file stored on S3 and served via CloudFront.
 */
class File extends Model implements Auditable
{
    use AuditableTrait;

    /** @use HasFactory<FileFactory> */
    use HasFactory;

    use SoftDeletes;

    /**
     * Cache key prefix for resolved URLs.
     */
    public const CACHE_PREFIX = 'file:';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'uuid', 'visibility', 'disk', 'folder_path', 'uploaded_name',
        'original_name', 'extension', 'mime_type', 'size', 'status', 'meta', 'error',
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
     * The owning model (uploader).
     */
    public function owner(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Stream an uploaded file to S3 and record it.
     */
    public function uploadFromFile(UploadedFile $file, string $visibility, ?Model $owner = null): static
    {
        $this->uuid = (string) Str::uuid();
        $this->visibility = $visibility;
        $this->disk = 's3';
        $this->original_name = $file->getClientOriginalName();
        $this->extension = $file->getClientOriginalExtension();
        $this->mime_type = $file->getClientMimeType();
        $this->size = $file->getSize();
        $this->uploaded_name = "{$this->uuid}.{$this->extension}";
        $this->folder_path = $this->resolveFolderPath($visibility);
        $this->status = FileEnum::STATUS['DRAFT'];

        if ($owner) {
            $this->owner()->associate($owner);
        }

        try {
            Storage::disk('s3')->putFileAs($this->folder_path, $file, $this->uploaded_name);
            $this->status = FileEnum::STATUS['UPLOADED'];
        } catch (\Throwable $e) {
            $this->status = FileEnum::STATUS['FAILED'];
            $this->error = $e->getMessage();
        }

        // Single save (with owner already bound) → one audit record, not two.
        $this->save();

        return $this;
    }

    /**
     * The CloudFront URL — permanent for public files, signed for private.
     */
    public function url(): ?string
    {
        if ($this->status !== FileEnum::STATUS['UPLOADED']) {
            return null;
        }

        return $this->visibility === FileEnum::VISIBILITY['PUBLIC'] ? $this->permanentUrl() : $this->signedUrl();
    }

    /**
     * The permanent, unsigned CloudFront URL.
     */
    public function permanentUrl(): string
    {
        return rtrim((string) config('filesystems.disks.s3.cloudfront.url'), '/')."/{$this->folder_path}/{$this->uploaded_name}";
    }

    /**
     * A cached CloudFront signed URL (signed ttl+5m, cached ttl). Without a
     * configured key pair (CloudFront signing is optional), the permanent URL
     * is returned as-is.
     */
    public function signedUrl(): string
    {
        if (blank(config('filesystems.disks.s3.cloudfront.key_pair_id'))) {
            return $this->permanentUrl();
        }

        $ttl = (int) config('filesystems.disks.s3.cloudfront.ttl', 10800);

        return Cache::remember(static::CACHE_PREFIX.$this->uuid, $ttl, function () use ($ttl) {
            return app(CloudFrontSigner::class)->sign($this->permanentUrl(), $ttl + 300);
        });
    }

    /**
     * Build the object's folder path. Private files sit at the env folder;
     * public files are rooted under the public folder (for the unsigned
     * CloudFront behaviour).
     */
    protected function resolveFolderPath(string $visibility): string
    {
        $folder = trim((string) config('filesystems.disks.s3.folder'), '/');

        if ($visibility === FileEnum::VISIBILITY['PUBLIC']) {
            $public = trim((string) config('filesystems.disks.s3.public_folder', 'public'), '/');

            return trim("{$public}/{$folder}", '/');
        }

        return $folder;
    }
}
