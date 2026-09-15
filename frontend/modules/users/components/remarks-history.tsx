import { Badge } from "@/components/ui/badge";
import { parseRemarks } from "@/modules/client-auth/lib/account-status";
import { cn } from "@/lib/utils";

// The account's review history, newest first. Shown PROMINENTLY during
// assessment on purpose: a re-applying account that was previously returned
// or sanctioned should be recognisable at a glance rather than after reading
// a wall of text.
//
// The backend prefixes each line with a dated tag, so the tag renders as a
// badge and the rest as the note.
const TAG_CLASS: Record<string, string> = {
  Returned: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Suspended: "bg-destructive/10 text-destructive",
  Demoted: "bg-muted text-muted-foreground",
};

export function RemarksHistory({ remarks }: { remarks: string | null | undefined }) {
  const entries = parseRemarks(remarks);
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="remarks-history" className="space-y-3">
      <h3 id="remarks-history" className="text-sm font-semibold tracking-tight">
        Review history
      </h3>
      <ul className="space-y-2">
        {entries.map((entry, index) => (
          <li
            key={`${entry.tag ?? "note"}-${entry.date ?? index}`}
            className={cn(
              "rounded-lg border p-3",
              // The newest entry is the one that explains the current state.
              index === 0 ? "border-border bg-muted/40" : "border-border/60",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {entry.tag ? (
                <Badge
                  variant="secondary"
                  className={TAG_CLASS[entry.tag] ?? "bg-muted text-muted-foreground"}
                >
                  {entry.tag}
                </Badge>
              ) : (
                <Badge variant="secondary">Note</Badge>
              )}
              {entry.date && (
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              )}
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
