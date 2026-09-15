import Link from "next/link";
import { ArrowRight, FolderKanban, Rocket, Terminal, Activity } from "lucide-react";

// The developer's four destinations, as one row of whole-card links. It
// replaced a single "Developer access" card: that pointed at one page and
// left /dashboard/usage with no way in from here at all. Whole-card links
// rather than cards containing buttons — the entire surface is one
// destination, so making only part of it clickable would be a smaller target
// for no reason.
const DEVELOPER_LINKS = [
  {
    href: "/dashboard/developers",
    icon: Terminal,
    title: "Credentials & catalog",
    description: "Your API keys and the services you can call.",
  },
  {
    href: "/dashboard/developers?tab=usage",
    icon: Activity,
    title: "API usage",
    description: "Every call you've made, with its response.",
  },
  {
    href: "/dashboard/projects",
    icon: FolderKanban,
    title: "My Projects",
    description: "Manage your entries and submit them for review.",
  },
  {
    href: "/projects",
    icon: Rocket,
    title: "Public showcase",
    description: "What everyone else has built.",
  },
] as const;

export function DeveloperAccessLink({
  children,
}: {
  // Rendered between the heading and the destination grid — the dashboard
  // slots the API-credits card here, so the heading covers the whole
  // developer area rather than only the links.
  children?: React.ReactNode;
}) {
  return (
    <section aria-labelledby="developer-access" className="space-y-3">
      {/* Titled like the API usage section above it — the two-tone heading
          plus a one-line subtitle — so the dashboard's sections speak with
          one voice. */}
      <div>
        <h2 id="developer-access" className="text-lg font-semibold tracking-tight">
          Developer <span className="text-primary">access</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your credits, keys, calls and projects — everything a developer manages in one
          place.
        </p>
      </div>

      {children}

      <div className="grid gap-4 sm:grid-cols-2">
        {DEVELOPER_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <item.icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                {item.title}
                <ArrowRight
                  aria-hidden
                  className="size-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
