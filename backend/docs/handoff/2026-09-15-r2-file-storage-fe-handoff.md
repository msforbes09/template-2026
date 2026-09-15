# Cloudflare R2 file storage — FE handoff

**PR:** pending (no git remote configured yet; branch `feature/r2-file-storage`)
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
