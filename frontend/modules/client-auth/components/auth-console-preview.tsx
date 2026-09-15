import {
  KeyRound,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Static product mockup shown on the auth brand panel (right column). It mirrors
// the landing HeroConsole's dashboard preview — the signed-in /dashboard page
// (welcome card + API catalog grid) — as a single cohesive card, sized and
// positioned by AuthCard to bleed off the bottom edge of the cobalt panel (the
// dashboard-preview treatment from the auth template). Server Component: fully
// static, no motion. Keep the persona + catalog copy in sync with HeroConsole.

const CATALOG_PREVIEW: {
  name: string;
  category: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    name: "eGov SSO",
    category: "Single sign-on",
    description: "Single Sign-On integration for eGov partners.",
    icon: KeyRound,
  },
  {
    name: "eVerify",
    category: "Identity verification",
    description:
      "Verify citizen identity against PhilSys in real time, with consent built into every check.",
    icon: ShieldCheck,
  },
  {
    name: "eMessage",
    category: "Notifications",
    description:
      "Deliver SMS, email and in-app notices to citizens through a single messaging API.",
    icon: MessagesSquare,
  },
  {
    name: "eGov AI",
    category: "AI services",
    description:
      "Document intelligence, translation and conversational endpoints tuned for government workloads.",
    icon: Sparkles,
  },
  {
    name: "eGovPay",
    category: "Digital payments",
    description:
      "Collect and reconcile government fees and charges through one gateway, with real-time settlement.",
    icon: Wallet,
  },
];

export function AuthConsolePreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-black/5 bg-white text-foreground shadow-[0_40px_80px_-24px_rgba(3,10,40,0.6)] ring-1 ring-white/10",
        className,
      )}
    >
      {/* Welcome strip — mirrors the dashboard's welcome card */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-2 ring-primary/15">
            J
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight tracking-tight">
              Welcome, Juan Dela Cruz
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              jdelacruz@email.com
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold">
            <KeyRound aria-hidden className="size-3.5" />
            Generate credentials
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold">
            <UserRound aria-hidden className="size-3.5" />
            View profile
          </span>
        </div>
      </div>

      {/* API catalog — same card anatomy as DashboardApiCatalog */}
      <div className="p-6">
        <p className="text-base font-semibold tracking-tight">
          API <span className="text-primary">catalog</span>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3.5">
          {CATALOG_PREVIEW.map((service) => (
            <div
              key={service.name}
              className="rounded-xl border border-border bg-card p-4"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <service.icon aria-hidden className="size-5" />
              </span>
              <p className="mt-3 text-sm font-semibold tracking-tight">
                {service.name}
              </p>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {service.category}
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground/90">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
