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
 * An uploaded file stored on Cloudflare R2: private files on the private
 * bucket (served by presigned URL), public files on the public bucket
 * (served from its custom domain).
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
     * Disk holding private files (private R2 bucket).
     */
    public const PRIVATE_DISK = 'r2';

    /**
     * Disk holding public files (public R2 bucket with a custom domain).
     */
    public const PUBLIC_DISK = 'r2-public';

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
     * The disk a file of the given visibility is stored on.
     */
    public static function diskFor(string $visibility): string
    {
        return $visibility === FileEnum::VISIBILITY['PUBLIC'] ? self::PUBLIC_DISK : self::PRIVATE_DISK;
    }

    /**
     * Stream an uploaded file to the disk matching its visibility and record it.
     */
    public function uploadFromFile(UploadedFile $file, string $visibility, ?Model $owner = null): static
    {
        $this->uuid = (string) Str::uuid();
        $this->visibility = $visibility;
        $this->disk = static::diskFor($visibility);
        $this->original_name = $file->getClientOriginalName();
        $this->extension = $file->getClientOriginalExtension();
        $this->mime_type = $file->getClientMimeType();
        $this->size = $file->getSize();
        $this->uploaded_name = "{$this->uuid}.{$this->extension}";
        $this->folder_path = trim((string) config("filesystems.disks.{$this->disk}.folder"), '/');
        $this->status = FileEnum::STATUS['DRAFT'];

        if ($owner) {
            $this->owner()->associate($owner);
        }

        try {
            Storage::disk($this->disk)->putFileAs($this->folder_path, $file, $this->uploaded_name);
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
     * The object key on its disk.
     */
    public function path(): string
    {
        return "{$this->folder_path}/{$this->uploaded_name}";
    }

    /**
     * The URL — permanent for public files, presigned for private.
     */
    public function url(): ?string
    {
        if ($this->status !== FileEnum::STATUS['UPLOADED']) {
            return null;
        }

        return $this->visibility === FileEnum::VISIBILITY['PUBLIC'] ? $this->permanentUrl() : $this->signedUrl();
    }

    /**
     * The permanent, unsigned URL on the public bucket's custom domain.
     */
    public function permanentUrl(): string
    {
        return rtrim((string) config('filesystems.disks.'.self::PUBLIC_DISK.'.url'), '/').'/'.$this->path();
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
}
