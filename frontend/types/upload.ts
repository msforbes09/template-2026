// Response shape from the Common API's POST /files/public and
// POST /files/private (Files) endpoints.
export type UploadedFile = {
  uuid: string;
  // Public files get a permanent CDN URL; private files get a signed
  // CloudFront URL that expires (~3h) — always use the freshest one returned
  // by the API rather than caching it long-term.
  url: string;
  original_name: string;
  mime_type: string;
  size: number;
};
