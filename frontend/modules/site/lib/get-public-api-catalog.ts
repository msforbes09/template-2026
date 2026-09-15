import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import type { PublicApiCatalog, PublicApiCatalogItem } from "@/types/public-api-catalog";

// Public, unauthenticated reads against the Common API — no session/audience
// token, so `undefined` audience with a "/common" basePathOverride (4th arg),
// same as ContentBlock. Public/SEO reads are the one sanctioned place server
// reads skip requireSession.
//
// These are the repo's only "use cache" reads, and deliberately so: every
// other read is per-session (a Bearer token in, a personalized payload out)
// and belongs in <Suspense> instead. This one is identical for every visitor,
// so caching it lets the public catalog page prerender in full — real HTML
// with metadata and JSON-LD in the initial response, and a genuine 404 for an
// unknown identifier rather than a 200 carrying an error state. The
// "api-catalogs" tag is the same one the admin actions already revalidate
// (modules/api-catalog/actions/api-catalog-actions.ts), so publishing or
// deactivating a catalog refreshes these pages.

// Returns null on 404 (unknown or inactive catalog) so callers can hand that
// to notFound(); any other failure still throws.
export async function getPublicApiCatalog(identifier: string): Promise<PublicApiCatalog | null> {
  "use cache";
  cacheTag("api-catalogs", `api-catalogs:${identifier}`);
  cacheLife("hours");

  try {
    const { data } = await apiFetch<{ data: PublicApiCatalog }>(
      `/api-catalogs/${identifier}`,
      {},
      undefined,
      "/common",
    );
    return data;
  } catch (err) {
    if (isApiError(err) && err.status === 404) return null;
    throw err;
  }
}

// The public list — minimal cards (identifier, name, description, meta).
// Backs generateStaticParams and the sitemap, both of which run at build
// time, so an empty array on failure degrades to "no prerendered detail
// pages" rather than failing the whole build.
export async function getPublicApiCatalogs(): Promise<PublicApiCatalogItem[]> {
  "use cache";
  cacheTag("api-catalogs");
  cacheLife("hours");

  try {
    const { data } = await apiFetch<{ data: PublicApiCatalogItem[] }>(
      "/api-catalogs",
      {},
      undefined,
      "/common",
    );
    return data;
  } catch {
    return [];
  }
}
