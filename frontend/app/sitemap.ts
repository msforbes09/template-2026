import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// The public pages only. Everything under /dashboard and /admin is noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_SITE_URL;
  return [
    { url: base },
    { url: `${base}/privacy-policy` },
    { url: `${base}/terms-of-service` },
    { url: `${base}/faqs` },
    { url: `${base}/login` },
    { url: `${base}/register` },
  ];
}
