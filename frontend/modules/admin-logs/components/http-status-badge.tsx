import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// `status_code` is a string in the API ("200"), and null when the call never
// got a response back from the remote service at all — that case reads as a failure,
// not as "unknown", and pairs with `exception` on the detail view.
function toneFor(statusCode: string | null): { className: string; label: string } {
  const numeric = Number(statusCode);
  if (!statusCode || Number.isNaN(numeric)) {
    return {
      label: statusCode ?? "No response",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  }
  if (numeric >= 500) {
    return { label: statusCode, className: "border-destructive/30 bg-destructive/10 text-destructive" };
  }
  if (numeric >= 400) {
    return {
      label: statusCode,
      className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    };
  }
  if (numeric >= 200 && numeric < 300) {
    return {
      label: statusCode,
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
  }
  return { label: statusCode, className: "border-border text-muted-foreground" };
}

// The code itself is the accessible text, so colour is never the only signal.
export function HttpStatusBadge({
  statusCode,
  className,
}: {
  statusCode: string | null;
  className?: string;
}) {
  const tone = toneFor(statusCode);

  return (
    <Badge variant="outline" className={cn("font-mono", tone.className, className)}>
      {tone.label}
    </Badge>
  );
}
