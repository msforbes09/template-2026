# Data Fetching, Caching & the Combobox Exception

Read for PPR, where reads vs mutations run, cache tagging/revalidation, and the one client-side GET (async combobox via useSWR).

Partial Prerendering is **mandatory** for dynamic pages. `next.config.ts` sets `cacheComponents: true`.

**Data-access rule (where each API call runs):**
- **Reads (GET)** → always **server-side**, inside async Server Components via `apiFetch`. Never fetch GET data from a client component.
- **Mutations (POST / PUT / PATCH / DELETE)** → always through **server actions** (`"use server"`), never a client-side `fetch`/`apiClientBrowser` call.
- **The one client-side GET exception:** an async **combobox / autocomplete** that fetches options as the user types, using **`useSWR`** against a dedicated internal route handler (not a direct backend call — see the combobox section below). This is the *only* place a client component may GET; everything else reads on the server.

This means `lib/api-client-browser.ts` exists solely for the typeahead exception; if you reach for it anywhere else, the design is wrong.

Core rule: **never await request-time data at the page root.** The page root must be statically prerenderable. All dynamic data goes inside Suspense-wrapped async Server Components with `Skeleton` fallbacks. This keeps the static shell instant and streams the dynamic parts.

## Every dynamic API counts, not just `apiFetch` — and not just `searchParams`

"Request-time data" isn't limited to your own backend calls. Next.js has a specific, closed set of APIs that are only resolvable once a real request exists — none of them may be awaited (or otherwise read) directly inside the **page component's own function body**. If you're unsure whether something is one of these, ask "would this API return the same thing at build time as it does for this specific request?" — if no, it's dynamic.

| Dynamic API | Where it shows up |
| --- | --- |
| `searchParams` | the `page.tsx` prop |
| `params` | the `page.tsx`/`layout.tsx` prop, **unless** the route is fully covered by `generateStaticParams` (then it's known at build/ISR time — see the caveat in `seo.md`) |
| `cookies()` | `next/headers` |
| `headers()` | `next/headers` |
| `draftMode()` | `next/headers` |
| `connection()` | `next/server` — Next's explicit "treat the rest of this render as dynamic" primitive; if you reach for it, you're intentionally opting out of prerendering for whatever it gates |

> Separately from PPR: if you write a `getClientIp()`, read only headers the
> trusted edge sets. `x-forwarded-for`'s left-most entry and `cf-connecting-ip`
> are caller-chosen, so anything keyed on them — audit attribution, rate-limit
> buckets — is keyed on a value the caller picked. See `security.md` rule 5.

**This is transitive.** Any of *your own* helpers that call one of these internally — `requireSession`/`getSession` (they call `headers()`, see `auth.md`), a custom `getClientIp()`, anything wrapping `cookies()` — is exactly as dynamic as the raw API. Calling `requireSession("admin")` directly in a page's own body is the same mistake as calling `headers()` there, just one layer removed; the fact that you didn't type the word `headers` doesn't exempt it.

The common mistake, using `searchParams` as the example (the same shape applies to any API in the table): a page is declared `async` and does `const { q } = await searchParams;` in its own function body, *before* returning JSX that happens to contain a `<Suspense>` boundary further down. That still breaks PPR — the await already ran as part of the page's own render, above and outside any Suspense boundary, so there's no boundary left to fence the dynamism off from the static shell, and the whole route falls back to fully dynamic rendering (the exact "page just blocks" symptom this rule exists to prevent).

The fix is the same regardless of which dynamic API is involved: **never resolve it in the page component at all.** Keep the page a plain, non-`async` function (or, if it has no dynamic props to forward, a fully static one) that passes any dynamic Promise prop straight through, unread, into the Suspense-wrapped component that actually needs it; only that inner component — which runs inside the boundary and is allowed to be `async` — calls `await`. The same goes for a `requireSession`/`getSession` guard: it belongs inside the Suspense-wrapped dynamic component (as in every example in this skill, e.g. `UsersList` in `crud-blueprint.md`), never inlined at the top of `page.tsx` itself. Route handlers (`route.ts`) and server actions are exempt from all of this — they're not part of the prerendered shell to begin with, so calling `cookies()`/`headers()`/`requireSession` there is completely normal.

### Canonical pattern: fan out the same Promise to several independent Suspense boundaries

`crud-blueprint.md` shows the single-consumer case (one list, one `searchParams` read). A page is just as often two or more independent widgets driven by the same dynamic prop — e.g. a result count next to the list it's counting. The page stays a plain pass-through; each widget gets its own `<Suspense>` boundary (own fallback, own streaming timeline) and its own `await` of the *same* Promise:

```tsx
// app/search/page.tsx — plain (non-async); searchParams is only ever forwarded, never read here
import { Suspense } from "react";
import { SearchResultsCount } from "@/modules/search/components/search-results-count";
import { SearchResultsCountSkeleton } from "@/modules/search/components/search-results-count-skeleton";
import { SearchResultsList } from "@/modules/search/components/search-results-list";
import { SearchResultsListSkeleton } from "@/modules/search/components/search-results-list-skeleton";

type SearchParams = Promise<{ q?: string; page?: string }>;

export default function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main>
      <h1 className="sr-only">Search</h1>
      {/* Two independent boundaries sharing one Promise — each awaits it separately
          (safe: a resolved Promise can be awaited any number of times), and each
          streams in on its own schedule instead of one slow fetch blocking the other. */}
      <Suspense fallback={<SearchResultsCountSkeleton />}>
        <SearchResultsCount searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<SearchResultsListSkeleton />}>
        <SearchResultsList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
```

```tsx
// modules/search/components/search-results-count.tsx — its own small dynamic hole
import { apiFetch } from "@/lib/api-client";

export async function SearchResultsCount({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { meta } = await apiFetch<{ meta: { total: number } }>(
    `/search/count?q=${encodeURIComponent(q)}`,
    { next: { tags: ["search"] } },
  );
  return <p aria-live="polite">{meta.total} result{meta.total === 1 ? "" : "s"}{q && ` for "${q}"`}</p>;
}
```

Two things worth calling out about this shape: every `<Suspense>` **must** get an explicit `fallback` that mirrors that specific component's dimensions (the skeleton-sizing rule above — a bare `<Suspense>` with no `fallback` renders nothing while pending, which both fails that rule and gives screen reader users no indication anything is loading), and there's no ceiling on how many sibling boundaries a page can fan out to — each one is an independent dynamic hole in an otherwise static shell.

Every route segment requires both `loading.tsx` and `error.tsx`.

**Skeleton-sizing rule:** a skeleton (Suspense fallback, `loading.tsx`, or modal loading state) must mirror the **real component's dimensions and layout** — same height, width, spacing, number of rows/columns, and overall shape. The point of a skeleton is to reserve the exact space the content will occupy so there's **no layout shift (CLS)** when it swaps in. A generic `<Skeleton className="h-96 w-full" />` placeholder defeats this. Build a dedicated skeleton component next to the real one (`[feature]-list-skeleton.tsx` beside `[feature]-list.tsx`) that reproduces its structure — table header + N rows, card grid with the same columns, form with the same field count — and reuse it in both the Suspense fallback and `loading.tsx`.

```tsx
// modules/products/components/product-list-skeleton.tsx — mirrors the real table
import { Skeleton } from "@/components/ui/skeleton";

export function ProductListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-72" />          {/* search toolbar */}
      <div className="rounded-md border">
        <Skeleton className="h-11 w-full" />        {/* table header row */}
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" /> // body rows = real row height
        ))}
      </div>
      <Skeleton className="h-9 w-64 self-end" />    {/* pagination */}
    </div>
  );
}
```

```tsx
// app/products/page.tsx — STATIC shell, nothing dynamic awaited here
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";

export const metadata = {
  title: "Products",
  description: "Browse and manage products.",
  openGraph: { title: "Products", description: "Browse and manage products." },
};

export default function ProductsPage() {
  return (
    <main>
      <h1 className="sr-only">Products</h1>
      <PageHeader title="Products" />
      <Suspense fallback={<ProductListSkeleton />}> {/* matches ProductList exactly */}
        <ProductList />
      </Suspense>
    </main>
  );
}
```

```tsx
// modules/products/components/product-list.tsx — dynamic work lives HERE
import { apiFetch } from "@/lib/api-client";

export async function ProductList() {
  const { data } = await apiFetch<{ data: Product[] }>("/products", {
    next: { tags: ["products"] },
  });
  return <DataTable columns={columns} data={data} />;
}
```

```tsx
// app/products/loading.tsx — reuse the same skeleton, no duplicate markup
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
export default function Loading() {
  return <ProductListSkeleton />;
}
```

```tsx
// app/products/error.tsx — see the logging section in `error-handling.md` for the dev/prod + Slack logging pattern
"use client";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";
import { env } from "@/lib/env";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportError(error.message, error.digest, "products/error"); }, [error]);
  const isDev = env.NODE_ENV !== "production"; // via lib/env, never process.env (env.md)
  return (
    <div role="alert" className="space-y-3">
      <p>Something went wrong loading products.</p>
      {isDev && <pre className="text-xs whitespace-pre-wrap">{error.message}</pre>}
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Cache tagging & revalidation (both halves of the pattern)

A `revalidateTag("users")` in a server action only does something if the GET that loaded that data was **tagged with the same string**. Always pair them:

- **GET** sets the tag via `next: { tags: [...] }` on the fetch.
- **Mutation action** calls `revalidateTag(sameTag)` after a successful write.

Tag convention: collection tag `resource` (e.g. `"users"`) for list reads; item tag `resource:id` (e.g. `"users:42"`) for single-record reads. A write revalidates both the collection and the affected item.

```ts
// reading — tag the GET (pass through apiFetch's init.next)
const { data } = await apiFetch<{ data: User[] }>("/users", {
  next: { tags: ["users"] },
});

const { data } = await apiFetch<{ data: User }>(`/users/${id}`, {
  next: { tags: [`users:${id}`] },
});
```

```ts
// writing — revalidate both tags in the action
revalidateTag("users");
revalidateTag(`users:${id}`);
```

> `apiFetch`'s third arg is `audience`; the `next.tags` go inside the second arg (`init`). For dynamic, request-time reads that must never cache (e.g. per-user dashboards), use `cache: "no-store"` instead of tags.

---

## Async Combobox / Autocomplete (the only client-side GET)

When a combobox must fetch options as the user types, the client component calls an **internal route handler** (`app/api/.../route.ts`), which runs server-side, attaches the audience's Bearer token, and proxies to the backend. The client never holds the backend token and never calls the backend directly.

> **Accessibility:** give the input an accessible name, and announce loading / "no matches" as text in an `aria-live` region — not only as a spinner. Use the shadcn Command component so `role="listbox"`/`option`, `aria-expanded`, and arrow/Enter/Escape keys are wired for you. Details in `accessibility.md`.

Why a route handler and not a server action: server actions are POST-only and serialize through the action queue, which is wrong for rapid typeahead reads. A GET route handler is the correct primitive for read-on-keystroke — and it keeps the actual backend GET server-side.

The client GET uses **`useSWR`** — it gives request dedup, caching by key, and automatic cancellation of stale requests, which is exactly what typeahead needs. The debounced query string becomes the SWR key; `apiClientBrowser` is the fetcher (hitting the internal route handler, never the backend). All other client GETs remain forbidden — `useSWR` is scoped to this combobox case only.

```ts
// app/api/users/search/route.ts — server-side; guards, then forwards the token
// (imports: isApiError from @/lib/api-error, safeErrorMessage from
//  @/lib/safe-error-message)
import { apiFetch } from "@/lib/api-client";
import { getSession } from "@/lib/auth/dal";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // route handlers return 401 instead of redirecting (the client handles it)
  const session = await getSession("admin");
  if (!session?.user.accessToken) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  // apiFetch THROWS on any non-2xx. Uncaught, the upstream message would surface
  // to the browser with the upstream status — and that message is backend
  // content (exception text, SQL fragments, internal hostnames). Mask it on the
  // way out; error-handling.md's masking rule is not limited to server actions.
  try {
    const { data } = await apiFetch<{ data: UserOption[] }>(
      `/users/search?q=${encodeURIComponent(q)}`,
      undefined,
      "admin", // audience for this route group
    );
    return NextResponse.json({ data });
  } catch (err) {
    const status = isApiError(err) ? err.status : 500;
    return NextResponse.json({ message: safeErrorMessage(err) }, { status });
  }
}
```

> In route handlers use the cached `getSession` and return **401**, not `requireSession` — `requireSession` calls `redirect()`, which is for pages/actions, not API responses. SWR surfaces the 401 as `error`, and the combobox shows its error state (the combobox section below).

```ts
// lib/swr-fetcher.ts — shared SWR fetcher built on the browser client
import { apiClientBrowser } from "@/lib/api-client-browser";
export const swrFetcher = <T>(url: string) => apiClientBrowser.get<T>(url);
```

```tsx
// modules/users/components/user-combobox.tsx — debounced query → useSWR
"use client";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { debounce } from "lodash-es";
import { swrFetcher } from "@/lib/swr-fetcher";
import { Combobox } from "@/components/ui/combobox"; // shadcn Command-based

export function UserCombobox({ onSelect }: { onSelect: (id: string) => void }) {
  const [query, setQuery] = useState(""); // ephemeral widget input, not page state

  // null key → SWR skips the request entirely (no fetch on empty input)
  const key = query ? `/api/users/search?q=${encodeURIComponent(query)}` : null;
  const { data, isLoading, error } = useSWR<{ data: UserOption[] }>(key, swrFetcher, {
    keepPreviousData: true,        // avoid flicker between keystrokes
    revalidateOnFocus: false,
    dedupingInterval: 300,
    shouldRetryOnError: false,     // don't hammer the backend on a failed search
  });

  // stable debounced setter — useMemo so it isn't recreated each render
  const onInputChange = useMemo(() => debounce((q: string) => setQuery(q), 300), []);

  return (
    <Combobox
      loading={isLoading}
      error={error ? "Couldn’t load results" : undefined}
      options={data?.data ?? []}
      emptyMessage={query && !isLoading ? "No matches" : "Type to search"}
      onInputChange={onInputChange}
      onSelect={onSelect}
      aria-label="Search users"
    />
  );
}
```

> `useState` here holds only the ephemeral input string driving the SWR key — not shared search/filter state (which lives in the URL per `seo.md`). SWR owns the options + loading state. The combobox's *selected value* feeds a form field, not the page URL.

---
