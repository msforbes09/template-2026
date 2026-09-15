import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

// The wordmark: a neutral mark plus the product name from the environment.
// Replace the SVG with the project's own mark; keep the name env-driven.
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-base font-semibold text-foreground", className)}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-6 shrink-0 text-primary" fill="currentColor">
        <rect x="2" y="2" width="20" height="20" rx="5" />
      </svg>
      <span>{env.NEXT_PUBLIC_APP_NAME}</span>
    </span>
  );
}
