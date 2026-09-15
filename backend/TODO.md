# TODO

Deferred work, grouped by area. Every open item says *why* it is deferred.
Done items stay, rewritten into a dense paragraph of what shipped (endpoints,
classes, deploy notes, spec link), so this file doubles as a changelog. Whenever
something is put off in a design or a review, add it here in the same change.

## Authentication & Authorization

## Users

## Files

- **Done (2026-09-15):** file storage moved from S3 + CloudFront to Cloudflare R2. Two disks (`r2` private, `r2-public` public) on the S3 driver; `File::diskFor()` picks by visibility and the `disk` column records it. Private URLs are cached S3 presigned URLs (`R2_PRIVATE_URL_TTL`, signed ttl+300s); public URLs are `R2_PUBLIC_URL` + path. `CloudFrontSigner` deleted. Galleries moved to the public disk under `gallery/`. Spec: `docs/superpowers/specs/2026-09-15-r2-file-storage-design.md`.
- **Deferred:** direct-to-R2 browser uploads via presigned PUT — not needed while uploads stay ≤10 MB images through the API.
- **Deferred:** placeholder image for pruned files. The `iam4bs-private` and `iam4bs-public` buckets carry a bucket-wide R2 lifecycle rule that deletes objects 60 days after upload (galleries under `gallery/` included). A `File`/`Gallery` row can therefore outlive its object; the UI should fall back to a placeholder served from the manually-managed `iam4bs-assets` bucket (`assets.iam4bs.dev`). Deferred until the placeholder asset exists.
- **Deferred:** CDN/custom domain for private files. R2 custom domains are plain public access and presigned URLs only work against the S3 API host, so the private bucket has no custom domain. If caching or a branded host is ever needed, put a Worker (token check + stream from the bucket binding) or Cloudflare Access in front. Not needed for profile photos.

## Administrators

## Notifications & Email

## Logging & Auditing

## Security review follow-ups

## Configuration

## Observability

## Deployment / CI-CD

## Ops / Docker

## API Documentation

## Realtime / Broadcasting

## Cleanup

## Future
