import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon aria-hidden className="size-5 text-muted-foreground" />
        </span>
      )}
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}
