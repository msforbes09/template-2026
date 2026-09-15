import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getPublicApiCatalogs } from "@/modules/site/lib/get-public-api-catalog";
import { getPublicProjectUuids } from "@/modules/projects/lib/get-public-projects";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL;
  // Public detail pages: one per active catalog, one per published project.
  // Both helpers swallow a failed read into an empty list, so a backend blip
  // trims the sitemap rather than breaking it.
  const [catalogs, projectUuids] = await Promise.all([
    getPublicApiCatalogs(),
    getPublicProjectUuids(),
  ]);
  return [
    { url: base },
    { url: `${base}/api-catalogs` },
    ...catalogs.map((catalog) => ({ url: `${base}/api-catalogs/${catalog.identifier}` })),
    { url: `${base}/projects` },
    { url: `${base}/egov-hackathon-2026-criteria` },
    ...projectUuids.map((uuid) => ({ url: `${base}/projects/${uuid}` })),
    { url: `${base}/privacy-policy` },
    { url: `${base}/terms-of-service` },
    { url: `${base}/faqs` },
    { url: `${base}/login` },
    { url: `${base}/register` },
  ];
}
