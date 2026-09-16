import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

// The wordmark: a teal tile with an amber notch, plus the product name from the
// environment. Replace the SVG with the project's own mark; keep the name env-driven.
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-6 shrink-0">
        <rect x="1" y="1" width="22" height="22" rx="6" className="fill-current text-primary" />
        <path
          d="M23 23H13.5A9.5 9.5 0 0 1 23 13.5Z"
          className="fill-current text-highlight"
          stroke="var(--background)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span>{env.NEXT_PUBLIC_APP_NAME}</span>
    </span>
  );
}
