# Cloudflare R2 file storage — design

**Date:** 2026-09-15
**Status:** approved (decided in session; see plan `docs/superpowers/plans/2026-09-15-r2-file-storage.md`)

## Problem

The Files module writes to a single S3 bucket and builds every URL from a
CloudFront distribution: public files get a permanent CloudFront URL, private
files get a CloudFront key-pair signed URL. The project is moving to
Cloudflare R2, which is S3-compatible for reads/writes but has no CloudFront
equivalent: no key-pair URL signing, and public access is per bucket, not per
prefix. On R2 the current code would either expose private files (no key pair
configured → permanent URL fallback) or hand out dead URLs (private bucket).

## Decisions

1. **Two buckets, two disks.** `r2` (private bucket, never public) and
   `r2-public` (public bucket behind an R2 custom domain). Both use the
   Flysystem `s3` driver against the R2 S3 endpoint with `region: auto` and
   path-style addressing. The default Laravel `s3` disk is removed. The app's
   own config no longer defines it, but Laravel's `LoadConfiguration`
   array-merges the framework's bundled `s3` disk back into
   `filesystems.disks`; that unused, credential-less entry is accepted rather
   than stripped at boot.
2. **Private files use S3 presigned URLs** via `Storage::disk('r2')->temporaryUrl()`,
   signed for `ttl + 300s` and cached for `ttl` (same cache key and TTL
   semantics as today). `CloudFrontSigner` and all CloudFront config are
   deleted. There is no unsigned fallback: a private file is only ever served
   through a presigned URL.
3. **Public files use the public bucket's custom-domain URL** (`R2_PUBLIC_URL`)
   plus the object path. No `public/` prefix any more: the bucket itself is
   public.
4. **The `disk` column records the real disk** (`r2` or `r2-public`) so
   storage operations use `$file->disk` rather than a hard-coded name.
5. **Galleries move to the public disk** (`r2-public`, folder `gallery`),
   since they are public reads.
6. **Dedicated `R2_*` env keys.** `AWS_*` keys are left to the CloudWatch log
   channel, which falls back to `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`;
   reusing them for R2 credentials would silently break CloudWatch.

## Env contract (`.env.example`)

```
FILESYSTEM_DISK=local
# Cloudflare R2 file storage — two buckets: private (presigned URLs) and public (custom domain).
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
# R2_BUCKET=            # private bucket
# R2_PUBLIC_BUCKET=     # public bucket (Public access enabled, custom domain attached)
# R2_PUBLIC_URL=https://cdn.example.com
# R2_FOLDER=uploads
# R2_PRIVATE_URL_TTL=10800
```

## API contract

Unchanged. `POST /api/v1/common/files/public` and `/private` return the same
`{uuid, url, original_name, mime_type, size}` shape; only the URL host and the
query string of private URLs differ. No frontend change.

## Out of scope

- Direct-to-R2 browser uploads (presigned PUT).
- Migrating existing objects between buckets (template project, no data).
- Renaming the `files.disk` column or adding a `bucket` column.
