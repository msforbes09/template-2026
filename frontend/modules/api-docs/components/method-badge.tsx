import { cn } from "@/lib/utils";

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  POST: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PUT: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  PATCH: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
  HEAD: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  OPTIONS: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

const METHOD_TEXT: Record<string, string> = {
  GET: "text-emerald-600 dark:text-emerald-400",
  POST: "text-amber-600 dark:text-amber-400",
  PUT: "text-sky-600 dark:text-sky-400",
  PATCH: "text-violet-600 dark:text-violet-400",
  DELETE: "text-red-600 dark:text-red-400",
  HEAD: "text-teal-600 dark:text-teal-400",
  OPTIONS: "text-slate-600 dark:text-slate-400",
};

export function MethodBadge({ method, className }: { method: string; className?: string }) {
  const upper = method.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 font-mono text-xs font-bold",
        METHOD_STYLES[upper] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {upper}
    </span>
  );
}

// Compact, color-only variant for dense sidebar rows.
export function MethodLabel({ method, className }: { method: string; className?: string }) {
  const upper = method.toUpperCase();
  const short = upper === "DELETE" ? "DEL" : upper === "OPTIONS" ? "OPT" : upper;
  return (
    <span
      className={cn(
        "w-9 shrink-0 text-right font-mono text-[10px] font-bold",
        METHOD_TEXT[upper] ?? "text-muted-foreground",
        className,
      )}
    >
      {short}
    </span>
  );
}
