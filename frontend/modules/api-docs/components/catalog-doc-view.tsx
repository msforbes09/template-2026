import Image from "next/image";
import { Activity, BookOpen, Info, KeyRound, Plug } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Markdown } from "@/components/ui/markdown";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalogTabs, type CatalogTab } from "@/modules/api-docs/components/catalog-tabs";
import { CollectionViewer } from "@/modules/api-docs/components/collection-viewer";
import { CodeBlock } from "@/modules/api-docs/components/code-block";
import { asPostmanCollection } from "@/modules/api-docs/lib/postman";
import {
  getCatalogLogo,
  getMetaExtensionShows,
  EXCHANGE_CODE_GENERATOR_EXTENSION,
  FACE_LIVENESS_SESSION_GENERATOR_EXTENSION,
} from "@/lib/catalog-meta";

// One catalog rendered as documentation — masthead, then Documentation /
// Integration / (optionally) Credentials / Usage tabs. Shared by the public
// anonymous page (app/(site)/api-catalogs/[identifier]) and the signed-in
// one (app/(site)/dashboard/api-catalogs/[identifier]); the two differ only
// in the kicker, whether the credentials and usage tabs are supplied, and
// whether a gateway base URL is known. A Server Component — CollectionViewer
// is the client leaf.
export function CatalogDocView({
  identifier,
  name,
  description,
  body,
  spec,
  meta,
  kicker = "API Documentation",
  headingPriority = false,
  credentialsTab,
  usageTab,
  baseUrl,
  baseUrlNotice,
  documentationFooter,
  interactive = true,
}: {
  identifier: string;
  name: string | null;
  description: string | null;
  body: string | null;
  spec: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  kicker?: string;
  // Marks the masthead logo as LCP-priority. Only the public page sets it —
  // there the header is the largest above-the-fold paint; the dashboard
  // page sits behind a session check and doesn't compete for that budget.
  headingPriority?: boolean;
  // Rendered under a third "Credentials" tab when supplied. Omitted on the
  // public page — an anonymous visitor has no credential to manage.
  credentialsTab?: React.ReactNode;
  // This citizen's gateway logs for this catalog, under a "Usage" tab. Also
  // omitted on the public page — there are no calls to show without a session.
  usageTab?: React.ReactNode;
  baseUrl?: string | null;
  baseUrlNotice?: React.ReactNode;
  // Rendered at the foot of the API documentation panel — the reviews thread
  // on both pages.
  //
  // A slot inside that panel rather than a sibling below the whole tab block,
  // which is how it used to sit: the thread is about the documentation, and
  // reading it under the Credentials or Usage tab made it look like a comment
  // on those. Being inside the panel is also what makes "documentation only"
  // structural — there is no tab check to keep in sync with the tab strip.
  // Callers still pass their own <Suspense>, so it streams independently.
  documentationFooter?: React.ReactNode;
  // Passed to CollectionViewer — false gives the read-only public viewer
  // (no Test tab, variables, or extension widgets). See its own comment for
  // why that's a correctness requirement anonymously, not just a trim.
  interactive?: boolean;
}) {
  const title = name ?? identifier;
  const logo = getCatalogLogo(identifier);
  const hasSpec = spec != null && Object.keys(spec).length > 0;
  const collection = hasSpec ? asPostmanCollection(spec) : null;
  const hasBody = body != null && body.trim().length > 0;
  // Must mirror the triggers rendered below exactly — it is what lets
  // CatalogTabs fall back when ?tab= names a tab this page doesn't have.
  const availableTabs: CatalogTab[] = [
    "documentation",
    ...(hasBody ? (["integration"] as const) : []),
    ...(credentialsTab ? (["credentials"] as const) : []),
    ...(usageTab ? (["usage"] as const) : []),
  ];
  // Not resolved at all in read-only mode — the widgets they name are
  // signed-in-only tools.
  //
  // Lists, not single names: one extension can be declared several times to
  // place it above several requests (eVerify does this for face liveness, on
  // both "Verify Personal Information" and "QR Verify").
  const exchangeCodeRequests = interactive
    ? getMetaExtensionShows(meta, EXCHANGE_CODE_GENERATOR_EXTENSION)
    : [];
  const faceLivenessRequests = interactive
    ? getMetaExtensionShows(meta, FACE_LIVENESS_SESSION_GENERATOR_EXTENSION)
    : [];

  const specContent = !hasSpec ? (
    <EmptyState
      title="No documentation yet"
      description="This API doesn't have a specification published yet."
    />
  ) : collection ? (
    <CollectionViewer
      collection={collection}
      exchangeCodeGeneratorRequests={exchangeCodeRequests}
      faceLivenessSessionGeneratorRequests={faceLivenessRequests}
      baseUrl={baseUrl}
      baseUrlNotice={baseUrlNotice}
      interactive={interactive}
    />
  ) : (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3">
        <Info aria-hidden className="mt-px size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          This spec isn&apos;t a Postman collection (it looks like an OpenAPI
          document), so the interactive viewer can&apos;t render it — showing
          the raw JSON instead.
        </p>
      </div>
      <CodeBlock label="Raw spec JSON" code={JSON.stringify(spec, null, 2)} />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Masthead — editorial kicker, logo/name, description at a readable
          measure. The tabs below give the header its base via their
          underline track. */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span aria-hidden className="h-3.5 w-1 rounded-full bg-primary" />
          {kicker}
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {!logo ? (
            title
          ) : logo.mark ? (
            // Square emblem alone wouldn't identify the service — pair it with
            // the name, matching the landing page's treatment.
            <span className="flex items-center gap-2.5">
              <Image
                src={logo.src}
                alt=""
                width={logo.w}
                height={logo.h}
                priority={headingPriority}
                className="size-8 shrink-0 object-contain"
              />
              {title}
            </span>
          ) : (
            <Image
              src={logo.src}
              alt={title}
              width={logo.w}
              height={logo.h}
              priority={headingPriority}
              className="h-8 w-auto object-contain"
            />
          )}
        </h1>
        {description && (
          <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <CatalogTabs available={availableTabs}>
        <TabsList variant="line" className="w-full justify-start gap-6 p-0">
          <TabsTrigger value="documentation" className="flex-none gap-1.5 px-0.5">
            <BookOpen aria-hidden className="size-3.5" />
            API documentation
          </TabsTrigger>
          {hasBody && (
            <TabsTrigger value="integration" className="flex-none gap-1.5 px-0.5">
              <Plug aria-hidden className="size-3.5" />
              Integration
            </TabsTrigger>
          )}
          {credentialsTab && (
            <TabsTrigger value="credentials" className="flex-none gap-1.5 px-0.5">
              <KeyRound aria-hidden className="size-3.5" />
              Credentials
            </TabsTrigger>
          )}
          {usageTab && (
            <TabsTrigger value="usage" className="flex-none gap-1.5 px-0.5">
              <Activity aria-hidden className="size-3.5" />
              Usage
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="documentation" className="pt-6" keepMounted>
          {specContent}
          {documentationFooter && <div className="mt-16">{documentationFooter}</div>}
        </TabsContent>
        {hasBody && (
          <TabsContent value="integration" className="pt-6" keepMounted>
            <Markdown className="max-w-[75ch]">{body ?? ""}</Markdown>
          </TabsContent>
        )}
        {credentialsTab && (
          <TabsContent value="credentials" className="pt-6" keepMounted>
            {credentialsTab}
          </TabsContent>
        )}
        {/* Deliberately NOT keepMounted, unlike its siblings: the usage list
            opens a Reverb subscription for the live tail, and a reader who
            never touches this tab shouldn't be paying for a websocket. The
            rows themselves are already in the RSC payload either way, so
            selecting the tab is still instant. */}
        {usageTab && (
          <TabsContent value="usage" className="pt-6">
            {usageTab}
          </TabsContent>
        )}
      </CatalogTabs>
    </div>
  );
}
