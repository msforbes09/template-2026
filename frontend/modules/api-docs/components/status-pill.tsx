import { cn } from "@/lib/utils";

function toneFor(code: number | undefined): string {
  if (!code) return "bg-muted text-muted-foreground";
  if (code < 300) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (code < 400) return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
  if (code < 500) return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-red-500/10 text-red-600 dark:text-red-400";
}

export function StatusPill({
  code,
  status,
  className,
}: {
  code?: number;
  status?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-semibold",
        toneFor(code),
        className,
      )}
    >
      {code}
      {status ? ` ${status}` : ""}
    </span>
  );
}
