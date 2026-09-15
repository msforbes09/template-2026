import { env } from "@/lib/env";
import { metaString } from "@/lib/catalog-meta";
import type { PublicApiCatalog } from "@/types/public-api-catalog";
import { serializeJsonLd } from "@/lib/json-ld";

// schema.org's WebAPI is the type that actually fits a catalog entry
// (documentation + provider), paired with a BreadcrumbList so the detail
// page reports its place under the landing page's services section. Takes
// the already-fetched catalog rather than fetching again — the page has it
// in hand, and this has to render in the same pass to land in the initial
// HTML where crawlers read it.
export function PublicApiCatalogJsonLd({ catalog }: { catalog: PublicApiCatalog }) {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const url = `${base}/api-catalogs/${catalog.identifier}`;
  const name = catalog.name ?? catalog.identifier;
  const category = metaString(catalog.meta, "title");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebAPI",
        "@id": `${url}#api`,
        name,
        url,
        documentation: url,
        ...(catalog.description ? { description: catalog.description } : {}),
        ...(category ? { applicationCategory: category } : {}),
        provider: { "@id": `${base}/#organization` },
      },
      // Repeated here, not just referenced: the landing page's graph
      // (LandingJsonLd) defines this same @id, but a consumer parsing this
      // URL in isolation only sees the graph on this page — a bare
      // {"@id": …} pointing at a node defined on a different document is a
      // dangling reference. Same @id, so the two merge rather than
      // duplicating when both pages are crawled.
      {
        "@type": "GovernmentOrganization",
        "@id": `${base}/#organization`,
        name: "Department of Information and Communications Technology",
        alternateName: "DICT",
        url: "https://dict.gov.ph",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: base },
          { "@type": "ListItem", position: 2, name: "API catalog", item: `${base}/api-catalogs` },
          { "@type": "ListItem", position: 3, name, item: url },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}
