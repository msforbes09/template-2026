import Link from "next/link";
import { ArrowRight, LayoutGrid, Rocket } from "lucide-react";

// Public destinations a draft account can browse right now, so the dashboard
// is a starting point rather than a dead end while the profile is
// incomplete. Both link to pages that need no account state at all.
const EXPLORE_LINKS = [
  {
    href: "/projects",
    icon: Rocket,
    title: "See what developers are building",
    description: "Browse the project showcase — the projects you'll be rating and reviewing.",
  },
  {
    href: "/#catalog",
    icon: LayoutGrid,
    title: "Browse the API catalog",
    description: "The government services you'll get credentials for as a developer.",
  },
] as const;

export function DashboardExploreCards() {
  return (
    <section aria-labelledby="explore" className="space-y-3">
      <h2 id="explore" className="text-sm font-medium text-muted-foreground">
        While you&rsquo;re here
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {EXPLORE_LINKS.map((item) => (
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
