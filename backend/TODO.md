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
