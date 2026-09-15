import Link from "next/link";
import { RatingSummary } from "@/modules/reviews/components/star-rating";
import { Reveal } from "@/components/ui/reveal";
import { metaString, resolveMetaIcon } from "@/lib/catalog-meta";
import type { UserApiCatalogListItem } from "@/types/user-api-catalog";

export function DashboardApiCatalog({ catalogs }: { catalogs: UserApiCatalogListItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {catalogs.map((catalog, index) => {
        const Icon = resolveMetaIcon(catalog.meta);
        const logoUrl = metaString(catalog.meta, "logo_url");
        const name = catalog.name ?? catalog.identifier;
        // meta.title holds a short category-style label (e.g. "Data
        // exchange"), not an alternate name — confirmed against the live
        // Common API response, where it's set alongside a matching
        // meta.icon for every entry.
        const category = metaString(catalog.meta, "title");
        return (
          <Reveal key={catalog.identifier} delay={index * 0.05}>
            <Link
              href={`/dashboard/api-catalogs/${catalog.identifier}`}
              className="flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
            >
              <div className="flex h-8 items-center">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-entered external logo URL, not configured for next/image
                  <img
                    src={logoUrl}
                    alt={name}
                    className="h-full w-auto max-w-40 object-contain"
                  />
                ) : (
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon aria-hidden className="size-5 text-primary" />
                  </span>
                )}
              </div>
              {/* The logo already carries the name (e.g. the "eGov SSO"
                  wordmark) — only show a text heading when there's no logo
                  to convey it. */}
              {!logoUrl && (
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{name}</h3>
              )}
              {category && (
                <p className="mt-6 text-sm font-medium text-muted-foreground">{category}</p>
              )}
              {catalog.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {catalog.description}
                </p>
              )}
              {/* Renders nothing until the API has been reviewed, so an
                  unreviewed card shows no empty star row. */}
              <RatingSummary subject={catalog} size="sm" className="mt-4" />
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}
