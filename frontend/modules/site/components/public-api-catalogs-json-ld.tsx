import { env } from "@/lib/env";
import { metaString } from "@/lib/catalog-meta";
import { serializeJsonLd } from "@/lib/json-ld";
import type { PublicApiCatalogItem } from "@/types/public-api-catalog";

// The /api-catalogs index: an ItemList naming every published API and pointing
// at its own page, so a crawler that reads this one URL learns the whole
// catalog rather than having to find nine detail pages by link-following.
//
// Each entry is a WebAPI — the same @type and the same @id the detail page's
// graph uses (PublicApiCatalogJsonLd), so the two merge on the shared @id
// instead of describing the same API twice.
//
// Takes the already-fetched list rather than reading again: the page has it in
// hand for its heading, and this has to render in the same pass to land in the
// initial HTML where crawlers read it.
export function PublicApiCatalogsJsonLd({ catalogs }: { catalogs: PublicApiCatalogItem[] }) {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const url = `${base}/api-catalogs`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name: "API catalog",
        isPartOf: { "@id": `${base}/#website` },
        about: { "@id": `${url}#list` },
      },
      {
        "@type": "ItemList",
        "@id": `${url}#list`,
        name: "eGov API catalog",
        numberOfItems: catalogs.length,
        itemListElement: catalogs.map((catalog, index) => {
          const name = catalog.name ?? catalog.identifier;
          const catalogUrl = `${base}/api-catalogs/${catalog.identifier}`;
          const category = metaString(catalog.meta, "title");
          return {
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "WebAPI",
              "@id": `${catalogUrl}#api`,
              name,
              url: catalogUrl,
              documentation: catalogUrl,
              ...(catalog.description ? { description: catalog.description } : {}),
              ...(category ? { applicationCategory: category } : {}),
              provider: { "@id": `${base}/#organization` },
            },
          };
        }),
      },
      // Repeated rather than referenced, for the same reason the detail page
      // repeats it: a consumer parsing this URL in isolation never sees the
      // landing page's graph, so a bare {"@id": …} would dangle. Same @id, so
      // they merge when both are crawled.
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
          { "@type": "ListItem", position: 2, name: "API catalog", item: url },
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
