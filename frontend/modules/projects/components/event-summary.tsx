import { CalendarDays, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { cssUrl } from "@/lib/css-url";
import { eventDateRange } from "@/modules/projects/lib/event-schedule";
import { eventMetaEntries } from "@/modules/projects/lib/event-meta";
import { isEventActive, type EgovEvent } from "@/types/project";

// The event banner at the top of the showcase: which programme these entries
// belong to, its cover photo, when it ran, whether it is still taking entries,
// and what it is about.
//
// The showcase resolved a specific event to build the grid but said nothing
// about it — the switcher named it only when more than one existed. Somebody
// landing on a shared /projects link could not tell a live call for entries
// from a finished programme's archive.
//
// THE PHOTO IS A BACKGROUND, NOT AN <img>, and that is load-bearing rather
// than stylistic. `photo.url` is a signed URL that expires (types/project.ts);
// getEgovEvents is now pinned to a one-hour cache to stay well inside that
// window, but caches and clocks being what they are, an expired URL is still
// possible. A background-image that 404s paints nothing and quietly reveals
// the gradient underneath it — where an <img> would show a broken-image icon
// and its alt text. The failure mode is invisible by construction.
//
// Which is also why the gradient is always rendered rather than only when
// there is no photo: it is the floor the banner stands on in every case.
//
// `meta` extras (venue, prizes, links) are read generically by
// eventMetaEntries rather than by key, because the bag is free-form and an
// event that calls its venue something else should still show it.
//
// Deliberately NOT shown: an entry count. The grid below is filtered, and a
// total up here would contradict it the moment anyone searched.
export function EventSummary({ event }: { event: EgovEvent }) {
  const when = eventDateRange(event);
  const open = isEventActive(event);
  const cover = cssUrl(event.photo?.url);
  // Venue, prizes, links — whatever this event actually carries. Read
  // generically rather than by key, since meta is free-form.
  const extras = eventMetaEntries(event.meta);

  // The API currently returns `description` identical to `name` for every live
  // event, and printing the title twice reads as a bug. Compared rather than
  // assumed, so a real description appears the moment somebody writes one.
  const blurb = event.description?.trim();
  const description =
    blurb && blurb.toLowerCase() !== event.name.trim().toLowerCase() ? blurb : null;

  return (
    <section
      aria-labelledby="event-summary-name"
      className="relative isolate overflow-hidden rounded-xl border border-border"
    >
      {/* Always painted: the surface the text is guaranteed to be legible on. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.55),transparent_45%),linear-gradient(120deg,#0b2da8_0%,#06145b_100%)]"
      />

      {cover && (
        <>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: cover }}
          />
          {/* Scrim. A cover photo is whatever an administrator uploaded — it
              can be pale, busy, or both — so contrast comes from this rather
              than from hoping the image is dark. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/45"
          />
        </>
      )}

      {/* Fixed dark surface, so these colours are literal by design — the same
          reasoning as the landing page's credential card. */}
      <div className="relative flex flex-wrap items-start justify-between gap-x-6 gap-y-3 p-6 sm:p-8">
        <div className="min-w-0">
          <h2
            id="event-summary-name"
            className="text-xl font-semibold tracking-tight text-white sm:text-2xl"
          >
            {event.name}
          </h2>
          {when && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-blue-50/80">
              <CalendarDays aria-hidden className="size-4 shrink-0" />
              {when}
            </p>
          )}
          {description && (
            <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-blue-50/90">
              {description}
            </p>
          )}

          {extras.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {extras.map((extra) => (
                <div key={extra.key} className="text-sm">
                  <dt className="text-blue-50/60">{extra.label}</dt>
                  <dd className="font-medium text-white">
                    {extra.href ? (
                      <a
                        href={extra.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                      >
                        {extra.value}
                        <ExternalLink aria-hidden className="size-3.5" />
                      </a>
                    ) : (
                      extra.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* State as text, never colour alone. */}
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
            open
              ? "bg-white text-blue-900"
              : "bg-white/15 text-blue-50 ring-1 ring-inset ring-white/25",
          )}
        >
          {open ? "Open for entries" : "Closed"}
        </span>
      </div>
    </section>
  );
}
