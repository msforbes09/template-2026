# Cloudflare R2 File Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move file uploads from S3 + CloudFront to Cloudflare R2, with a private bucket served through S3 presigned URLs and a separate public bucket served through its custom domain.

**Architecture:** Two Flysystem `s3`-driver disks (`r2` private, `r2-public` public) replace the single `s3` disk. The `File` model picks the disk from the upload's visibility, stores it in the existing `disk` column, and builds URLs from it: `temporaryUrl()` for private files (cached, same TTL semantics as the old CloudFront signer), custom-domain concatenation for public files. `CloudFrontSigner` and all CloudFront config are deleted. Galleries move to the public disk.

**Tech Stack:** Laravel 13, `league/flysystem-aws-s3-v3` (already installed; R2 is S3-compatible), PHPUnit 12, Laravel Pint.

**Spec:** `docs/superpowers/specs/2026-09-15-r2-file-storage-design.md`

## Global Constraints

- All `composer` / `php artisan` / `vendor/bin/pint` commands run from `backend/project/`.
- Every class and method gets a PHPDoc block, tests included.
- No fully-qualified class names inline; import at the top.
- `env()` only inside `config/*.php`; everywhere else read `config(...)`.
- Never edit `.env`; update `.env.example` and tell the user what to set.
- URL paths stay kebab-case; body fields stay snake_case. No endpoint paths change in this plan.
- API resources: booleans as `1`/`0`, datetimes as `Y-m-d H:i:s`. Not touched here, but do not regress.
- Keep `#[OA\...]` attributes in sync with any changed description/example.
- Verification baseline before every commit: `php artisan test` green and `vendor/bin/pint --dirty` clean.
- Branch rules: never commit to `main`/`develop`; open a PR and stop. Do not merge.

---

### Task 0: Branch

**Files:** none

- [ ] **Step 1: Create the feature branch**

`develop` does not exist yet in this template repo (only `main`), so branch off `main`:

```bash
cd /Volumes/Developer/Projects/Personal/template-2026-09
git fetch origin
git checkout -b feature/r2-file-storage origin/main
git branch --show-current
```

Expected: `feature/r2-file-storage`.

---

### Task 1: R2 disks in config and env template

**Files:**
- Modify: `project/config/filesystems.php:42-62` (replace the `s3` disk)
- Modify: `project/.env.example:132-142` (replace the AWS/CloudFront block)
- Modify: `project/phpunit.xml:25-26` (replace `AWS_*` envs)
- Create: `project/tests/Unit/Config/R2DisksConfigTest.php`

**Interfaces:**
- Produces: config keys `filesystems.disks.r2.{driver,key,secret,region,bucket,endpoint,use_path_style_endpoint,folder,private_url_ttl}` and `filesystems.disks.r2-public.{driver,key,secret,region,bucket,endpoint,use_path_style_endpoint,url,folder}`. Later tasks read `folder`, `url`, and `private_url_ttl` from these.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit\Config;

use Tests\TestCase;

/**
 * Guards the shape of the two Cloudflare R2 disks: both ride the S3 driver
 * against the R2 endpoint, the private disk carries the presigned-URL TTL,
 * and the public disk carries the custom-domain base URL.
 */
class R2DisksConfigTest extends TestCase
{
    /**
     * Both R2 disks use the S3 driver with R2's required addressing.
     */
    public function test_both_r2_disks_use_the_s3_driver_against_r2(): void
    {
        foreach (['r2', 'r2-public'] as $disk) {
            $this->assertSame('s3', config("filesystems.disks.{$disk}.driver"), $disk);
            $this->assertSame('auto', config("filesystems.disks.{$disk}.region"), $disk);
            $this->assertTrue(config("filesystems.disks.{$disk}.use_path_style_endpoint"), $disk);
            $this->assertSame('uploads', config("filesystems.disks.{$disk}.folder"), $disk);
        }
    }

    /**
     * The private disk carries the presigned URL TTL; the public disk carries the public base URL key.
     */
    public function test_private_ttl_and_public_url_keys_exist(): void
    {
        $this->assertSame(10800, config('filesystems.disks.r2.private_url_ttl'));
        $this->assertArrayHasKey('url', config('filesystems.disks.r2-public'));
        $this->assertArrayNotHasKey('s3', config('filesystems.disks'));
    }
}
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
php artisan test tests/Unit/Config/R2DisksConfigTest.php
```

Expected: FAIL. `config('filesystems.disks.r2.driver')` is null.

- [ ] **Step 3: Replace the `s3` disk in `config/filesystems.php`**

Delete the whole `'s3' => [ ... ]` block and put this in its place:

```php
        // Cloudflare R2 (S3-compatible). Private bucket: objects are only ever
        // reachable through presigned URLs. Public bucket: "Public access" is
        // enabled on the bucket and a custom domain is attached; objects are
        // served from that domain by plain URL.
        'r2' => [
            'driver' => 's3',
            'key' => env('R2_ACCESS_KEY_ID'),
            'secret' => env('R2_SECRET_ACCESS_KEY'),
            'region' => 'auto',
            'bucket' => env('R2_BUCKET'),
            'endpoint' => env('R2_ENDPOINT'),
            'use_path_style_endpoint' => true,
            'throw' => false,
            'report' => false,
            'folder' => env('R2_FOLDER', 'uploads'),
            'private_url_ttl' => (int) env('R2_PRIVATE_URL_TTL', 10800),
        ],

        'r2-public' => [
            'driver' => 's3',
            'key' => env('R2_ACCESS_KEY_ID'),
            'secret' => env('R2_SECRET_ACCESS_KEY'),
            'region' => 'auto',
            'bucket' => env('R2_PUBLIC_BUCKET'),
            'endpoint' => env('R2_ENDPOINT'),
            'use_path_style_endpoint' => true,
            'throw' => false,
            'report' => false,
            'url' => env('R2_PUBLIC_URL'),
            'folder' => env('R2_FOLDER', 'uploads'),
        ],
```

- [ ] **Step 4: Replace the AWS block in `.env.example`**

Replace lines 132–142 (the `# File uploads (S3 + CloudFront)` comment through `# AWS_CLOUDFRONT_TTL=10800`) with:

```
# File uploads (Cloudflare R2) — two buckets. Private objects are served by S3
# presigned URL (R2_PRIVATE_URL_TTL seconds, cached); public objects by plain URL
# from the public bucket's custom domain. R2_ENDPOINT is the account's S3 API
# endpoint. Kept separate from AWS_* so the CloudWatch log channel is unaffected.
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
# R2_BUCKET=
# R2_PUBLIC_BUCKET=
# R2_PUBLIC_URL=https://cdn.example.com
# R2_FOLDER=uploads
# R2_PRIVATE_URL_TTL=10800
```

- [ ] **Step 5: Replace the `AWS_*` envs in `phpunit.xml`**

Replace lines 25–26:

```xml
        <env name="R2_BUCKET" value="test-private-bucket"/>
        <env name="R2_PUBLIC_BUCKET" value="test-public-bucket"/>
        <env name="R2_PUBLIC_URL" value="https://cdn.test"/>
```

- [ ] **Step 6: Run the test and watch it pass**

```bash
php artisan test tests/Unit/Config/R2DisksConfigTest.php
```

Expected: PASS (2 tests). The rest of the suite is now red because the `s3` disk is gone; Task 2 fixes that. Do not commit yet.

---

### Task 2: `File` picks its disk from visibility and stores on it

**Files:**
- Modify: `project/app/Models/Misc/Files/File.php`
- Modify: `project/database/migrations/2026_07_06_100000_create_files_table.php:19` (`disk` default)
- Modify: `project/database/factories/Misc/Files/FileFactory.php:34`
- Modify: `project/tests/Feature/Files/FileModelTest.php`
- Modify (sweep, `Storage::fake('s3')` + `disks.s3.*` config): `project/tests/Feature/Files/UploadsFilesTest.php`, `project/tests/Feature/Files/FileUploadEndpointTest.php`, `project/tests/Feature/Security/FileAuthorizationTest.php`, `project/tests/Feature/Security/FileThreatScanTest.php`, `project/tests/Feature/Access/AccessSeederTest.php`, `project/tests/Feature/Galleries/GalleryTest.php`

**Interfaces:**
- Produces on `File`: `public const PRIVATE_DISK = 'r2'`, `public const PUBLIC_DISK = 'r2-public'`, `public static function diskFor(string $visibility): string`, `public function path(): string` (`"{folder_path}/{uploaded_name}"`), `public function permanentUrl(): string`. Task 3 relies on `path()` and `$this->disk`; Task 4 relies on `PUBLIC_DISK`.

- [ ] **Step 1: Rewrite `FileModelTest` with the failing tests**

Replace the whole file:

```php
<?php

namespace Tests\Feature\Files;

use App\Enums\FileEnum;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Tests the File model's disk selection, upload, and public URL behaviour.
 */
class FileModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Fake both R2 disks and pin the folder + public URL.
     */
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(File::PRIVATE_DISK);
        Storage::fake(File::PUBLIC_DISK);
        config([
            'filesystems.disks.r2.folder' => 'uploads',
            'filesystems.disks.r2-public.folder' => 'uploads',
            'filesystems.disks.r2-public.url' => 'https://cdn.test',
        ]);
    }

    /**
     * A public upload lands on the public disk, records that disk, and resolves a plain custom-domain URL.
     */
    public function test_public_upload_stores_on_public_disk_and_builds_permanent_url(): void
    {
        $file = (new File)->uploadFromFile(UploadedFile::fake()->image('photo.jpg'), FileEnum::VISIBILITY['PUBLIC']);

        $this->assertSame(FileEnum::STATUS['UPLOADED'], $file->status);
        $this->assertSame(File::PUBLIC_DISK, $file->disk);
        $this->assertSame('uploads', $file->folder_path);
        Storage::disk(File::PUBLIC_DISK)->assertExists("uploads/{$file->uploaded_name}");
        Storage::disk(File::PRIVATE_DISK)->assertMissing("uploads/{$file->uploaded_name}");

        $this->assertSame("https://cdn.test/uploads/{$file->uploaded_name}", $file->url());
    }

    /**
     * A private upload lands on the private disk only and records that disk.
     */
    public function test_private_upload_stores_on_private_disk(): void
    {
        $file = (new File)->uploadFromFile(UploadedFile::fake()->image('photo.jpg'), FileEnum::VISIBILITY['PRIVATE']);

        $this->assertSame(FileEnum::STATUS['UPLOADED'], $file->status);
        $this->assertSame(File::PRIVATE_DISK, $file->disk);
        Storage::disk(File::PRIVATE_DISK)->assertExists("uploads/{$file->uploaded_name}");
        Storage::disk(File::PUBLIC_DISK)->assertMissing("uploads/{$file->uploaded_name}");
    }

    /**
     * diskFor maps visibility to the matching disk name.
     */
    public function test_disk_for_maps_visibility_to_disk(): void
    {
        $this->assertSame('r2-public', File::diskFor(FileEnum::VISIBILITY['PUBLIC']));
        $this->assertSame('r2', File::diskFor(FileEnum::VISIBILITY['PRIVATE']));
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

```bash
php artisan test tests/Feature/Files/FileModelTest.php
```

Expected: FAIL with `Undefined constant App\Models\Misc\Files\File::PRIVATE_DISK`.

- [ ] **Step 3: Update `File.php` (disk selection, storage, public URL)**

Replace the class docblock, add constants after `CACHE_PREFIX`, and replace `uploadFromFile`, `permanentUrl`, and `resolveFolderPath`. Leave `url()` and `signedUrl()` alone for now (Task 3 replaces `signedUrl()`). Full resulting file, except `signedUrl()` which stays as it is today:

```php
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

    // signedUrl() unchanged in this task — replaced in Task 3.
}
```

Keep the existing `signedUrl()` method body (and its `CloudFrontSigner` import) in place until Task 3.

- [ ] **Step 4: Change the migration default and the factory**

In `database/migrations/2026_07_06_100000_create_files_table.php` line 19:

```php
            $table->string('disk')->default('r2');
```

In `database/factories/Misc/Files/FileFactory.php` line 34:

```php
            'disk' => File::PRIVATE_DISK,
```

- [ ] **Step 5: Run `FileModelTest` and watch it pass**

```bash
php artisan test tests/Feature/Files/FileModelTest.php
```

Expected: PASS (3 tests).

- [ ] **Step 6: Sweep the other tests that fake the old `s3` disk**

Apply these exact replacements. Every `Storage::fake('s3')` becomes two fakes so both disks exist regardless of visibility. `disks.s3.folder` becomes both `r2` folders, and `disks.s3.cloudfront.url` becomes `disks.r2-public.url`.

`tests/Feature/Files/UploadsFilesTest.php` — in both test methods replace:

```php
        Storage::fake('s3');
        config(['filesystems.disks.s3.folder' => 'uploads', 'filesystems.disks.s3.cloudfront.url' => 'https://cdn.test']);
```

with:

```php
        Storage::fake(File::PRIVATE_DISK);
        Storage::fake(File::PUBLIC_DISK);
        config(['filesystems.disks.r2.folder' => 'uploads', 'filesystems.disks.r2-public.folder' => 'uploads', 'filesystems.disks.r2-public.url' => 'https://cdn.test']);
```

and add `use App\Models\Misc\Files\File;` to the imports if it is not already there.

`tests/Feature/Files/FileUploadEndpointTest.php` — in `setUp()` replace the `Storage::fake('s3');` line and the `config([...])` array with:

```php
        Storage::fake(File::PRIVATE_DISK);
        Storage::fake(File::PUBLIC_DISK);
        config([
            'filesystems.disks.r2.folder' => 'uploads',
            'filesystems.disks.r2-public.folder' => 'uploads',
            'filesystems.disks.r2-public.url' => 'https://cdn.test',
            'filesystems.disks.s3.cloudfront.key_pair_id' => 'TESTKEY',
            'filesystems.disks.s3.cloudfront.ttl' => 10800,
        ]);
```

(The two `cloudfront` keys keep the still-present `signedUrl()` on the signer path until Task 3 removes them.) Add `use App\Models\Misc\Files\File;`. In `test_public_upload` change the assertion to:

```php
        $this->assertStringContainsString('https://cdn.test/uploads/', $response->json('data.url'));
```

`tests/Feature/Security/FileAuthorizationTest.php` and `tests/Feature/Security/FileThreatScanTest.php` — replace:

```php
        Storage::fake('s3');
        config(['filesystems.disks.s3.folder' => 'uploads']);
```

with:

```php
        Storage::fake(File::PRIVATE_DISK);
        Storage::fake(File::PUBLIC_DISK);
        config(['filesystems.disks.r2.folder' => 'uploads', 'filesystems.disks.r2-public.folder' => 'uploads']);
```

and import `App\Models\Misc\Files\File` in each if missing.

`tests/Feature/Access/AccessSeederTest.php` — replace `Storage::fake('s3');` with:

```php
        Storage::fake(File::PRIVATE_DISK);
        Storage::fake(File::PUBLIC_DISK);
```

and import `App\Models\Misc\Files\File`.

`tests/Feature/Galleries/GalleryTest.php` — replace every `Storage::fake('s3');` (six occurrences) with `Storage::fake(File::PUBLIC_DISK);`, replace line 41's config with `config(['filesystems.disks.r2-public.url' => 'https://cdn.example.com']);`, and import `App\Models\Misc\Files\File`. `GalleryTest` will still fail until Task 4 moves the model; that is expected.

- [ ] **Step 7: Run the whole suite**

```bash
php artisan test
```

Expected: everything green except `GalleryTest` (fixed in Task 4) and the CloudFront-dependent tests, which still pass at this point because `signedUrl()` is untouched. If anything else is red, fix the sweep before moving on.

- [ ] **Step 8: Pint and commit**

```bash
vendor/bin/pint --dirty
git add -A
git commit -m "Store uploads on Cloudflare R2 disks picked by visibility"
```

---

### Task 3: Presigned URLs for private files, CloudFront removed

**Files:**
- Modify: `project/app/Models/Misc/Files/File.php` (`signedUrl()`, imports)
- Delete: `project/app/Services/Files/CloudFrontSigner.php`
- Delete: `project/tests/Feature/Files/FileUrlWithoutCloudFrontTest.php`
- Modify: `project/tests/Feature/Files/PrivateFileUrlTest.php`
- Modify: `project/tests/Feature/Files/FileUploadEndpointTest.php` (drop signer stub + cloudfront keys)
- Modify: `project/tests/Feature/Administrators/AdministratorPhotoTest.php` (drop signer stub + cloudfront keys)

**Interfaces:**
- Consumes: `File::path()`, `$file->disk`, `config('filesystems.disks.r2.private_url_ttl')` from Tasks 1–2.
- Produces: `File::signedUrl(): string` returning `Storage::disk($this->disk)->temporaryUrl(...)`, cached under `File::CACHE_PREFIX.$uuid` for `private_url_ttl` seconds, signed for `private_url_ttl + 300` seconds.

Note on the fake: `Storage::fake()` registers a temporary-URL builder that returns `URL::to($path.'?expiration='.<timestamp>)`, so tests can assert on the `expiration=` query and on exact expiry with frozen time. No stub binding is needed.

- [ ] **Step 1: Rewrite `PrivateFileUrlTest` with the failing tests**

```php
<?php

namespace Tests\Feature\Files;

use App\Enums\FileEnum;
use App\Models\Misc\Files\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Tests private-file presigned URL resolution + caching on the private R2 disk.
 */
class PrivateFileUrlTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Fake the private disk and pin the TTL.
     */
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(File::PRIVATE_DISK);
        config(['filesystems.disks.r2.private_url_ttl' => 10800]);
    }

    /**
     * A private file resolves to a presigned URL for its object path, valid ttl + 5 minutes.
     */
    public function test_private_file_resolves_to_a_presigned_url(): void
    {
        $this->freezeTime();
        $file = File::factory()->create(['visibility' => FileEnum::VISIBILITY['PRIVATE']]);

        $url = $file->url();

        $this->assertStringContainsString($file->path(), $url);
        $this->assertStringEndsWith('?expiration='.now()->addSeconds(10800 + 300)->timestamp, $url);
    }

    /**
     * The presigned URL is cached for the TTL, so a second resolve does not re-sign.
     */
    public function test_presigned_url_is_cached(): void
    {
        $file = File::factory()->create(['visibility' => FileEnum::VISIBILITY['PRIVATE']]);
        $signCalls = 0;
        Storage::disk(File::PRIVATE_DISK)->buildTemporaryUrlsUsing(function (string $path) use (&$signCalls) {
            $signCalls++;

            return "https://r2.test/{$path}?sig=test";
        });

        $first = $file->signedUrl();
        $second = $file->signedUrl();

        $this->assertSame($first, $second);
        $this->assertSame(1, $signCalls);
        $this->assertTrue(Cache::has(File::CACHE_PREFIX.$file->uuid));
    }

    /**
     * A private file that is not uploaded yet has no URL.
     */
    public function test_unuploaded_private_file_has_no_url(): void
    {
        $file = File::factory()->create(['visibility' => FileEnum::VISIBILITY['PRIVATE'], 'status' => FileEnum::STATUS['FAILED']]);

        $this->assertNull($file->url());
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

```bash
php artisan test tests/Feature/Files/PrivateFileUrlTest.php
```

Expected: the first two tests FAIL. With no CloudFront key pair configured, `signedUrl()` still returns the permanent URL, which contains no `expiration=` and never touches the temporary-URL builder.

- [ ] **Step 3: Replace `signedUrl()` and drop the CloudFront import**

In `File.php` remove `use App\Services\Files\CloudFrontSigner;` and replace the `signedUrl()` method (docblock included) with:

```php
    /**
     * A cached S3 presigned URL on the private bucket: signed for ttl + 5 minutes
     * and cached for ttl, so a URL handed out at the end of the cache window is
     * still valid for the client that receives it.
     */
    public function signedUrl(): string
    {
        $ttl = (int) config('filesystems.disks.'.self::PRIVATE_DISK.'.private_url_ttl', 10800);

        return Cache::remember(static::CACHE_PREFIX.$this->uuid, $ttl, function () use ($ttl) {
            return Storage::disk($this->disk)->temporaryUrl($this->path(), now()->addSeconds($ttl + 300));
        });
    }
```

- [ ] **Step 4: Delete the signer and its fallback test**

```bash
git rm project/app/Services/Files/CloudFrontSigner.php project/tests/Feature/Files/FileUrlWithoutCloudFrontTest.php
```

If `app/Services/Files/` is now empty, remove the directory too.

- [ ] **Step 5: Remove the signer stubs from the two remaining tests**

`tests/Feature/Files/FileUploadEndpointTest.php` — delete the `use App\Services\Files\CloudFrontSigner;` import, delete the two `filesystems.disks.s3.cloudfront.*` config lines added in Task 2, and delete the whole `$this->app->bind(CloudFrontSigner::class, ...)` statement. Change `test_private_upload_is_signed` to:

```php
    /**
     * Private upload returns a presigned url.
     */
    public function test_private_upload_is_presigned(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/common/files/private', ['file' => UploadedFile::fake()->image('a.jpg')])
            ->assertCreated()->assertJsonPath('data.url', fn ($url) => str_contains($url, '?expiration='));
    }
```

`tests/Feature/Administrators/AdministratorPhotoTest.php` — delete the `CloudFrontSigner` import and the `bind` statement, and replace the `config([...])` line in `setUp()` with:

```php
        Storage::fake(File::PRIVATE_DISK);
```

adding `use Illuminate\Support\Facades\Storage;` and `use App\Models\Misc\Files\File;` if missing. Update the docblock on `setUp()` to `Fake the private R2 disk so profile photos resolve to presigned URLs.` Then find every assertion in that file that expects `?sig=test` and change it to assert `str_contains($url, '?expiration=')` in the same style as above.

- [ ] **Step 6: Confirm nothing references CloudFront in app or tests**

```bash
grep -rn -i "cloudfront" app tests config
```

Expected: no output.

- [ ] **Step 7: Run the suite**

```bash
php artisan test
```

Expected: green except `GalleryTest` (Task 4).

- [ ] **Step 8: Pint and commit**

```bash
vendor/bin/pint --dirty
git add -A
git commit -m "Serve private files by S3 presigned URL and drop CloudFront signing"
```

---

### Task 4: Galleries on the public disk

**Files:**
- Modify: `project/app/Models/Misc/Galleries/Gallery.php:17,29,34,62,82,97-104`
- Modify: `project/tests/Feature/Galleries/GalleryTest.php` (already partly swept in Task 2)

**Interfaces:**
- Consumes: `File::PUBLIC_DISK` and `config('filesystems.disks.r2-public.url')`.
- Produces: `Gallery::DISK = File::PUBLIC_DISK`, `Gallery::FOLDER = 'gallery'`.

- [ ] **Step 1: Make the gallery URL test assert the public disk**

In `GalleryTest.php`, in the test around line 40–49 that asserts `url()`, make it also assert the object landed on the public disk under the new folder. After the existing `assertSame(... $gallery->url())` add:

```php
        $this->assertSame('gallery', $gallery->folder_path);
        Storage::disk(File::PUBLIC_DISK)->assertExists("gallery/{$gallery->uploaded_name}");
```

- [ ] **Step 2: Run it and watch it fail**

```bash
php artisan test tests/Feature/Galleries/GalleryTest.php
```

Expected: FAIL. The model still writes to the removed `s3` disk (a `Disk [s3] does not have a configured driver` error, or the folder assertion fails with `public/gallery`).

- [ ] **Step 3: Move the model to the public disk**

In `Gallery.php`:

- Line 17 docblock: `url() is the permanent (unsigned) URL on the public R2 bucket's custom domain.`
- Line 29: `public const DISK = File::PUBLIC_DISK;` and add `use App\Models\Misc\Files\File;` to the imports.
- Line 34: `public const FOLDER = 'gallery';` (the bucket is public; no `public/` prefix).
- `url()` docblock: `The permanent, unsigned public-bucket URL — null until the upload succeeded.`
- `url()` body's return line:

```php
        return rtrim((string) config('filesystems.disks.'.self::DISK.'.url'), '/')."/{$this->folder_path}/{$this->uploaded_name}";
```

Lines 62 and 82 already use `self::DISK` and need no change.

- [ ] **Step 4: Run the full suite and watch it pass**

```bash
php artisan test
```

Expected: fully green.

- [ ] **Step 5: Pint and commit**

```bash
vendor/bin/pint --dirty
git add -A
git commit -m "Store galleries on the public R2 bucket"
```

---

### Task 5: Docs, OpenAPI, TODO, handoff

**Files:**
- Modify: `project/app/Http/Controllers/Common/CommonApiDoc.php:21`
- Modify: `project/app/Http/Controllers/Common/Files/UploadPrivateFileController.php` (class docblock + `url` property description/example)
- Modify: `project/app/Http/Controllers/Common/Files/UploadPublicFileController.php` (class docblock + `url` example)
- Modify: `project/app/Models/Administrators/Resources/AdministratorResource.php:24`
- Modify: `CLAUDE.md` (Files bullet, line 81)
- Modify: `TODO.md` (done entry under a new `## Files` heading)
- Create: `docs/handoff/2026-09-15-r2-file-storage-fe-handoff.md`
- Modify: `../.claude/sessions/2026-09-15.md` (shipped entry)

- [ ] **Step 1: OpenAPI text**

`CommonApiDoc.php` line 21:

```php
#[OA\Tag(name: 'Files', description: 'File uploads (Cloudflare R2: private bucket via presigned URL, public bucket via custom domain).')]
```

`UploadPrivateFileController.php`: class docblock → `Upload a private file and return its UUID + a cached S3 presigned URL on the private R2 bucket.`; the `url` property →

```php
                    new OA\Property(property: 'url', type: 'string', description: 'S3 presigned URL on the private bucket (expires ~3h)', example: 'https://<account-id>.r2.cloudflarestorage.com/private-bucket/uploads/9f1c....jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=11100&X-Amz-Signature=...'),
```

`UploadPublicFileController.php`: class docblock → `Upload a public file and return its permanent URL on the public R2 bucket's custom domain.`; the `url` example → `'https://cdn.example.com/uploads/9f1c2d3e-....jpg'`.

`AdministratorResource.php` line 24: description `'S3 presigned URL on the private bucket'`, example `'https://<account-id>.r2.cloudflarestorage.com/private-bucket/uploads/9f1c....jpg?X-Amz-Signature=...'`.

- [ ] **Step 2: Regenerate the docs to prove the attributes still parse**

```bash
php artisan l5-swagger:generate common
php artisan l5-swagger:generate administrators
```

Expected: both finish without error.

- [ ] **Step 3: `CLAUDE.md` Files bullet (line 81)**

```markdown
- **Files** — uploads to Cloudflare R2 on two disks: `r2` (private bucket, served by cached S3 presigned URLs, `R2_PRIVATE_URL_TTL`) and `r2-public` (public bucket, served from its custom domain `R2_PUBLIC_URL`). `File::diskFor()` picks the disk from visibility and the `disk` column records it; galleries live on the public disk. `OwnedFileRule` for IDOR-safe references, MIME/size/threat validation. `R2_*` env keys are deliberately separate from `AWS_*` (CloudWatch).
```

Also in `project/app/Enums/FileEnum.php`, the `THREATS` docblock mentions `S3/CloudFront` twice; replace both with `R2` (the storage still never executes code, which is the point of that sentence).

- [ ] **Step 4: `TODO.md`**

Add after the `## Users` section:

```markdown
## Files

- **Done (2026-09-15):** file storage moved from S3 + CloudFront to Cloudflare R2. Two disks (`r2` private, `r2-public` public) on the S3 driver; `File::diskFor()` picks by visibility and the `disk` column records it. Private URLs are cached S3 presigned URLs (`R2_PRIVATE_URL_TTL`, signed ttl+300s); public URLs are `R2_PUBLIC_URL` + path. `CloudFrontSigner` deleted. Galleries moved to the public disk under `gallery/`. Spec: `docs/superpowers/specs/2026-09-15-r2-file-storage-design.md`.
- **Deferred:** direct-to-R2 browser uploads via presigned PUT — not needed while uploads stay ≤10 MB images through the API.
```

- [ ] **Step 5: FE handoff**

Create `docs/handoff/2026-09-15-r2-file-storage-fe-handoff.md`:

```markdown
# Cloudflare R2 file storage — FE handoff

**PR:** #<n> (pending merge into `main`)
**Breaking changes:** none

## Endpoints

`POST /api/v1/common/files/public` and `POST /api/v1/common/files/private`
keep the same auth, request, and response shape:

```json
{
  "data": {
    "uuid": "9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
    "url": "https://cdn.example.com/uploads/9f1c2d3e-....jpg",
    "original_name": "photo.jpg",
    "mime_type": "image/jpeg",
    "size": 20481
  }
}
```

Only the `url` host changes:

- Public files: the public bucket's custom domain (`R2_PUBLIC_URL`), permanent.
- Private files (including admin/user profile photos): an S3 presigned URL on
  the R2 S3 endpoint with `X-Amz-*` query params, valid ~3 hours. Treat it as
  opaque and re-fetch the owning record for a fresh one; never cache it beyond
  the session.

## UI consequences

None. Any `next/image` remote-pattern or CSP `img-src` allowlist must include
the new hosts: the custom domain and `*.r2.cloudflarestorage.com`.

## Notes

Deploy prerequisite: `R2_*` env values set per
`backend/project/.env.example`; the public bucket needs Public access
enabled and the custom domain attached in Cloudflare.
```

- [ ] **Step 6: Session note**

Append to `../.claude/sessions/2026-09-15.md` under the shipped section: `R2 file storage: two disks, presigned private URLs, CloudFront removed, galleries on public bucket — branch feature/r2-file-storage, PR pending.`

- [ ] **Step 7: Final verification and commit**

```bash
php artisan test
vendor/bin/pint --test
```

Expected: suite green, Pint reports no issues.

```bash
git add -A
git commit -m "Document Cloudflare R2 file storage"
```

---

### Task 6: Open the PR and stop

- [ ] **Step 1: Push explicitly**

```bash
git push -u origin feature/r2-file-storage
```

- [ ] **Step 2: Open the PR against `main`**

```bash
gh pr create --base main --title "Move file storage to Cloudflare R2" --body "$(cat <<'EOF'
## Summary
- Replace the single `s3` disk + CloudFront with two Cloudflare R2 disks: `r2` (private bucket) and `r2-public` (public bucket, custom domain).
- Private files are served by cached S3 presigned URLs (`R2_PRIVATE_URL_TTL`, signed ttl+300s); `CloudFrontSigner` and all CloudFront config are removed.
- Public files and galleries live on the public bucket and are served from `R2_PUBLIC_URL`.
- API contract unchanged; see `docs/handoff/2026-09-15-r2-file-storage-fe-handoff.md`.

## Env to set (see `.env.example`)
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_PUBLIC_BUCKET`, `R2_PUBLIC_URL`, optional `R2_FOLDER`, `R2_PRIVATE_URL_TTL`.

## Security review
- IDOR: `OwnedFileRule` untouched; private objects reachable only via presigned URL from the private bucket.
- Secrets: R2 credentials read via `config()` only; kept separate from `AWS_*` used by CloudWatch.
- Data exposure: no `public/` prefix trick any more — visibility is enforced by bucket, so a private file can never sit in the public bucket.

## Test plan
- `php artisan test` green, `vendor/bin/pint --test` clean.
- Manual: upload a public and a private image against a real R2 account; confirm the public URL loads, the private URL loads until expiry and 403s after.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Stop.** Do not merge. Report the PR URL and the env values the user must set.

---

## Self-review

- **Spec coverage:** two disks (Task 1), disk chosen by visibility and recorded (Task 2), presigned private URLs with cache and no fallback (Task 3), public URL from custom domain with no `public/` prefix (Task 2), galleries on public disk (Task 4), `R2_*` env keys separate from `AWS_*` (Task 1), API contract unchanged and documented (Task 5). CloudFront fully removed (Task 3 grep). No gaps.
- **Placeholder scan:** the only `<n>` / `<account-id>` tokens are user-supplied values in docs and examples, not plan placeholders.
- **Type consistency:** `File::PRIVATE_DISK` / `File::PUBLIC_DISK` / `File::diskFor(string): string` / `File::path(): string` are defined in Task 2 and used identically in Tasks 3–5; config keys `filesystems.disks.r2.private_url_ttl` and `filesystems.disks.r2-public.url` match Task 1.
