import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The curated lists stopped being their own endpoints: TOP 30 is a tag
  // filter on an event's projects. This keeps existing links, bookmarks and
  // anything already indexed working instead of 404ing.
  //
  // Done here rather than with permanentRedirect() in a page: that route was
  // statically prerendered, so the redirect came back inside the RSC payload
  // as a 200 rather than as a real 308 an HTTP client or crawler would follow.
  async redirects() {
    return [
      {
        source: "/projects/top-30",
        destination: "/projects?tag=TOP+30",
        permanent: true,
      },
    ];
  },
  cacheComponents: true,
  // Emits a self-contained .next/standalone build (minimal traced
  // node_modules + a server.js entrypoint) for the Docker image.
  output: "standalone",
  experimental: {
    // Server Actions default to a 1MB request body — too small for a
    // real photo upload (modules/uploads/actions/upload-actions.ts takes
    // the raw FormData/File directly as its argument). The backend API
    // itself caps uploads at 5MB (see NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB in
    // lib/env.ts); this stays a bit above that for multipart overhead
    // rather than matching it exactly, and above it stays nginx.conf's
    // client_max_body_size so nginx is never the layer that rejects a
    // request first.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
