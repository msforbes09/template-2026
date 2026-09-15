# Metadata, SEO & Accessibility

Read for page metadata rules, accessibility requirements, the URL-as-source-of-truth rule for search/filter/pagination, and the full client/public-page SEO patterns (generateMetadata, JSON-LD, sitemap, robots). Admin pages are `noindex`.

## Metadata & accessibility (all pages)

Every page needs a `metadata` export or `generateMetadata` — unique `title`, `description`, and OpenGraph. Client/public pages get full SEO treatment; admin pages are `noindex`.

Semantic HTML is required: exactly one `h1` per page, correct heading hierarchy, `alt` on all images, `aria-label` on icon-only buttons. Full accessibility rules — including the interactive components — are in `accessibility.md`.

## URL search params = source of truth

**Never hold search/filter/sort/pagination state in `useState`.** Read it from the URL (`useSearchParams` on the client, `searchParams` prop on the server) and write it back with `router.replace`. `useState` is only for ephemeral UI state with no business meaning — modal open/close, dropdown open state, in-flight loading flags. The moment a value affects *which data is shown*, it belongs in the URL.

- Read on the server via the `searchParams` page prop, but keep the page component itself **non-`async`** and forward the raw Promise down — awaiting `searchParams` in the page's own body (even before `return`) makes the whole route dynamic, regardless of Suspense used further down. Only the Suspense-wrapped component that needs the value should `await` it. See the `UsersPage`/`UsersList` split in `crud-blueprint.md` and the "Core rule" callout in `data-fetching.md` for why.
- Read on the client via `useSearchParams`; write via `router.replace(`${pathname}?${next}`)`.
- Debounce text-search writes (~300ms); reset `page` to 1 whenever a filter/search changes.
- Use `replace`, not `push`, so the back button doesn't step through every keystroke.

```tsx
// Icon button needs an aria-label
<Button size="icon" aria-label="Delete user" onClick={onDelete}>
  <TrashIcon />
</Button>
```

## SEO — client / site pages (audience-aware)

> Guard exception: the `apiFetch` calls on this page are **public reads** (product detail, sitemap) and intentionally **skip `requireSession`** — these pages must be crawlable. This is the one sanctioned place server-side reads run unguarded. Any read behind auth still guards per `auth.md`.

SEO rules differ by audience:

- **Client / public site pages** (the `(client)` route group) are **SEO-first**: full `generateMetadata` with canonical URL, OpenGraph, Twitter card, and JSON-LD structured data where it fits. These must render meaningful content server-side (PPR shell + streamed content is fine — crawlers get the prerendered HTML).
- **Admin / authenticated pages** are **not** for indexing: set `robots: { index: false, follow: false }` and skip OG/structured data. Don't waste effort SEO-tuning a login-gated dashboard.

`metadataBase` is set once in the root layout (`structure.md`), so page-level `openGraph`/`canonical` can use relative paths and Next resolves them to absolute URLs.

```tsx
// app/(client)/products/[slug]/page.tsx — SEO-first detail page
import type { Metadata } from "next";
import { apiFetch } from "@/lib/api-client";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await apiFetch<{ data: Product }>(
    `/products/${slug}`,
    { next: { tags: [`products:${slug}`] } },
    "client",
  );
  const url = `/products/${data.slug}`;
  return {
    title: data.name,                       // → "<name> · Acme" via root template
    description: data.summary,
    alternates: { canonical: url },         // canonical to avoid duplicate-URL dilution
    openGraph: {
      type: "website",
      url,
      title: data.name,
      description: data.summary,
      images: data.image ? [{ url: data.image, alt: data.name }] : [],
    },
    twitter: { card: "summary_large_image", title: data.name, description: data.summary },
  };
}

// Prefer generateStaticParams for these routes so the whole page is
// prerendered per slug at build time (or via ISR) — then awaiting `params`
// here is fine, because there's no request-time dynamism left to protect;
// the entire route, JSON-LD included, is already static output.
export async function generateStaticParams() {
  const { data } = await apiFetch<{ data: Product[] }>("/products?all=1", { next: { tags: ["products"] } }, "client");
  return data.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main>
      {/* JSON-LD structured data for rich results */}
      <ProductJsonLd slug={slug} />
      {/* …static shell + <Suspense> content per `data-fetching.md`… */}
    </main>
  );
}
```

> Unlike `searchParams` (always request-time, never know all values ahead), a dynamic route's `params` for a page covered by `generateStaticParams` is known at build/ISR time — so `await`-ing it directly in the page body doesn't cost PPR anything; the whole route is already static output, not a shell-plus-dynamic-hole. If a product slug can fall outside the pre-generated set (long-tail inventory, `dynamicParams: true` fallback), that specific request does render dynamically end-to-end — an accepted trade-off for these pages, since the JSON-LD/metadata need to be in the initial HTML for crawlers rather than deferred behind a Suspense fallback. Reach for `generateStaticParams`/ISR first; only fall back to fully dynamic rendering for the genuinely long-tail slugs.

```tsx
// JSON-LD: a server component that emits a <script type="application/ld+json">
//
// ALWAYS serialise with serializeJsonLd(), never bare JSON.stringify(). Inside
// <script> the HTML tokenizer decides where the element ends — it scans for the
// literal `</script`, whatever the JSON quoting — so any backend-supplied
// string in the graph (a name, a title) closes the tag early and the rest is
// parsed as HTML. serializeJsonLd escapes < > & (and U+2028/9) losslessly.
import { apiFetch } from "@/lib/api-client";
import { serializeJsonLd } from "@/lib/json-ld";

export async function ProductJsonLd({ slug }: { slug: string }) {
  const { data } = await apiFetch<{ data: Product }>(`/products/${slug}`, {
    next: { tags: [`products:${slug}`] },
  }, "client");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.name,
    description: data.summary,
    image: data.image,
    offers: {
      "@type": "Offer",
      price: data.price,
      priceCurrency: "PHP",
      availability: data.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}
```

```tsx
// app/(admin)/layout.tsx (or metadata in admin pages) — keep admin out of the index
import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
```

Site-wide SEO files live at the `app/` root:

```ts
// app/sitemap.ts — generated from backend data (public URLs only)
import type { MetadataRoute } from "next";
import { apiFetch } from "@/lib/api-client";
import { env } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await apiFetch<{ data: Product[] }>("/products?all=1", {
    next: { tags: ["products"] },
  }, "client");
  const base = env.NEXT_PUBLIC_SITE_URL;
  return [
    { url: base, lastModified: new Date() },
    ...data.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
```

```ts
// app/robots.ts — allow public, disallow admin/api
import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_SITE_URL;
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

> Checklist for client pages: unique `title` + `description`, `canonical`, OpenGraph + Twitter, one `h1`, semantic headings, `alt` text, JSON-LD where a schema.org type fits (Product, Article, BreadcrumbList, Organization), and inclusion in `sitemap.ts`. Admin pages: `robots: noindex` and nothing else.
