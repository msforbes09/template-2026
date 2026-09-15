import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// A queue tile: a number that is also the way to act on it. Every tile links
// to the list filtered to exactly what it counted, so the figure and the
// screen behind it cannot drift apart. Counts are plain numbers now — the
// summary endpoint answers all-or-nothing, so a failed read hides the whole
// section rather than rendering per-number dashes.
export function DashboardStat({
  label,
  count,
  href,
  icon: Icon,
  emptyLabel,
}: {
  label: string;
  count: number;
  href: string;
  icon: LucideIcon;
  emptyLabel: string;
}) {
  // Only a non-empty queue is highlighted — the point of this row is to be
  // scannable for "is there anything for me to do", so a clear queue should
  // read as quiet, not as a card competing for attention.
  const waiting = count > 0;

  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full items-start gap-4 rounded-xl border p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        waiting
          ? "border-primary/40 bg-primary/[0.03] hover:border-primary"
          : "border-border bg-card hover:border-primary/40",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          waiting ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "text-3xl font-semibold leading-none tabular-nums",
              !waiting && "text-muted-foreground",
            )}
          >
            {count}
          </span>
          <ArrowRight
            aria-hidden
            className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
        <span className="mt-1.5 block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {waiting ? "Open the queue" : emptyLabel}
        </span>
      </span>
    </Link>
  );
}

// Reference figures — context, not work. Deliberately a compact divided strip
// rather than more cards, so they never compete with the queue row above
// however large the numbers get.
export function DashboardGlance({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-1 flex-col gap-0.5 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
    >
      <span className="text-xl font-semibold leading-none tabular-nums">{count}</span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        <ArrowRight
          aria-hidden
          className="size-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
      </span>
    </Link>
  );
}
