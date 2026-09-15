<?php

namespace App\Models\Misc\Files;

use App\Enums\FileEnum;
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
use RuntimeException;

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
     * The public bucket's base URL, right-trimmed of a trailing slash. Throws
     * when it is not configured rather than silently building a relative URL.
     */
    public static function publicBaseUrl(): string
    {
        $url = (string) config('filesystems.disks.'.self::PUBLIC_DISK.'.url');

        if ($url === '') {
            throw new RuntimeException('Public file URL base is not configured; set R2_PUBLIC_URL.');
        }

        return rtrim($url, '/');
    }

    /**
     * The permanent, unsigned URL on the public bucket's custom domain.
     */
    public function permanentUrl(): string
    {
        return self::publicBaseUrl().'/'.$this->path();
    }

    /**
     * A cached S3 presigned URL on the private bucket: signed for ttl + 5 minutes
     * and cached for ttl, so a URL handed out at the end of the cache window is
     * still valid for the client that receives it. The TTL is clamped to a
     * minimum of 60 seconds so a blank/zero/negative config never disables the
     * cache or signs an already-expired URL.
     */
    public function signedUrl(): string
    {
        $ttl = max(60, (int) config('filesystems.disks.'.self::PRIVATE_DISK.'.private_url_ttl', 10800));

        return Cache::remember(static::CACHE_PREFIX.$this->uuid, $ttl, function () use ($ttl) {
            return Storage::disk($this->disk)->temporaryUrl($this->path(), now()->addSeconds($ttl + 300));
        });
    }
}
