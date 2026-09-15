import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import type { Content } from "@/types/content";
import { safeErrorMessage } from "@/lib/safe-error-message";
import { sanitizeContentHtml } from "@/lib/sanitize-content";

const PROSE_CLASS = cn(
  "max-w-none text-base leading-relaxed text-muted-foreground",
  "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2:first-child]:mt-0",
  "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground",
  "[&_p]:mb-4 [&_p:last-child]:mb-0",
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1.5",
  "[&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic",
);

// One CMS body → one block card per section. The admin editor's convention is
// an <h2> per section (legal pages); FAQ-style bodies use an <h3> per question
// instead, so when a body has no h2s we split on h3s. A body with neither
// renders as a single unlabelled card. Headings keep their raw inner HTML
// (entities and all — the body is already trusted, it's injected raw below);
// tags are stripped so a heading can't smuggle block markup into the card
// title or the rail nav.
type ContentSection = { id: string; heading: string; html: string };

function slugify(heading: string) {
  return heading
    .toLowerCase()
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitSections(body: string): { intro: string; sections: ContentSection[] } {
  for (const tag of ["h2", "h3"] as const) {
    const matches = [...body.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi"))];
    if (matches.length === 0) continue;

    const seen = new Map<string, number>();
    const sections = matches.map((match, i) => {
      const start = match.index + match[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
      const heading = match[1].replace(/<[^>]+>/g, "").trim();
      const base = slugify(heading) || `section-${i + 1}`;
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      return {
        id: count > 1 ? `${base}-${count}` : base,
        heading,
        html: body.slice(start, end).trim(),
      };
    });
    return { intro: body.slice(0, matches[0].index).trim(), sections };
  }
  return { intro: body.trim(), sections: [] };
}

function SectionCard({
  index,
  heading,
  children,
  id,
}: {
  index?: number;
  heading?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-[20px] border border-border bg-card/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.035)] backdrop-blur sm:p-8"
    >
      {heading && (
        <div className="mb-4 flex items-baseline gap-4">
          {index !== undefined && (
            <span aria-hidden className="font-mono text-xs font-medium text-primary">
              {String(index).padStart(2, "0")}
            </span>
          )}
          <h2
            className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
            dangerouslySetInnerHTML={{ __html: heading }}
          />
        </div>
      )}
      {children}
    </section>
  );
}

// Public, unauthenticated read against the Common API — no session/audience
// token required; the "/common" basePathOverride on apiFetch (4th arg) targets
// the public endpoint directly.
export async function ContentBlock({ identifier }: { identifier: string }) {
  // Caught here rather than left to throw into error.tsx — a Suspense-wrapped
  // Server Component's thrown error doesn't reliably reach the nearest error
  // boundary in this app (see AdministratorsList for the same pattern).
  let content: Content;
  try {
    const response = await apiFetch<{ data: Content }>(
      `/contents/${identifier}`,
      { next: { tags: [`contents:${identifier}`] } },
      undefined,
      "/common",
    );
    content = response.data;
  } catch (err) {
    const message =
      isApiError(err) && err.status === 404
        ? "This page hasn't been published yet."
        : safeErrorMessage(err, "Something went wrong loading this page.");
    return <EmptyState icon={AlertTriangle} title="Couldn't load this page" description={message} />;
  }

  // Sanitised ONCE, here, before anything is derived from it. All four
  // dangerouslySetInnerHTML sites below (intro twice, section.html, and both
  // heading renders) read out of this one string, so cleaning it at the source
  // covers them together and there is no path that reaches an unsanitised
  // fragment. splitSections() is pure slicing — it neither adds nor removes
  // markup — so sanitising before it is equivalent to sanitising each piece,
  // and cannot be forgotten when a fifth site is added.
  const { intro, sections } = splitSections(sanitizeContentHtml(content.body.en ?? ""));

  return (
    <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
      {/* Rail — the timestamp always shows; the anchor nav is a desktop affordance
          (on mobile it would push the actual content below the fold). */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-sm text-muted-foreground">
          Last updated{" "}
          <time
            className="font-medium text-foreground"
            dateTime={content.updated_at ?? undefined}
          >
            {formatDate(content.updated_at, "MMMM d, yyyy")}
          </time>
        </p>
        {sections.length > 1 && (
          <nav aria-label="On this page" className="mt-8 hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
              On this page
            </p>
            <ol className="mt-3 border-l border-border">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="group -ml-px flex items-baseline gap-2.5 border-l-2 border-transparent py-1.5 pl-4 text-sm leading-snug text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    <span
                      aria-hidden
                      className="font-mono text-[10px] text-muted-foreground/60 transition-colors group-hover:text-primary"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: section.heading }} />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </aside>

      <div className="grid content-start gap-4">
        {intro &&
          (sections.length > 0 ? (
            <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: intro }} />
          ) : (
            <SectionCard>
              <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: intro }} />
            </SectionCard>
          ))}
        {sections.map((section, i) => (
          <SectionCard key={section.id} id={section.id} index={i + 1} heading={section.heading}>
            <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: section.html }} />
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
