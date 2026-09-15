import Link from "next/link";
import { ArrowRight, Bell, UserRound } from "lucide-react";

// Destinations inside the account area, so the dashboard is a starting point
// rather than a dead end.
const EXPLORE_LINKS = [
  {
    href: "/dashboard/profile",
    icon: UserRound,
    title: "Your profile",
    description: "Contact details, personal information and your address.",
  },
  {
    href: "/dashboard/notifications",
    icon: Bell,
    title: "Notifications",
    description: "Announcements and security notices about your account.",
  },
] as const;

export function DashboardExploreCards() {
  return (
    <section aria-labelledby="explore" className="space-y-3">
      <h2 id="explore" className="text-sm font-medium text-muted-foreground">
        Your account
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
