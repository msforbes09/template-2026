"use client";

import { Badge } from "@/components/ui/badge";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";
import { humanize } from "@/lib/humanize";
import { cn } from "@/lib/utils";

// A polymorphic "Model#id" reference — an audit subject, the actor behind an
// audit/connection/auth-attempt entry — rendered as one chip instead of the
// raw "GatewayCredential#1" string. The raw morph name stays on `title` so
// an operator cross-referencing the database still sees exactly what the API
// sent; the visible label is the readable form ("Gateway Credential").
//
// Pass `filter` to make the chip a button that applies those URL params
// (via useUpdateSearchParams) — a one-click "show me more like this".
export function ModelRefBadge({
  type,
  id,
  fallback,
  filter,
}: {
  type: string | null | undefined;
  id: string | number | null | undefined;
  // What to show when there's no type at all — "Not resolved", "—".
  fallback: string;
  filter?: Record<string, string | null>;
}) {
  const update = useUpdateSearchParams();

  if (!type) return <span className="text-sm text-muted-foreground">{fallback}</span>;

  const raw = `${type}#${id ?? "?"}`;
  const body = (
    <>
      <span>{humanize(type)}</span>
      <span className="font-mono text-muted-foreground">#{id ?? "?"}</span>
    </>
  );

  if (filter) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 font-normal whitespace-nowrap",
          "cursor-pointer hover:bg-muted hover:text-muted-foreground",
        )}
        title={`${raw} — click to filter`}
        render={
          <button
            type="button"
            onClick={() => update(filter, { resetPage: true, scroll: false })}
          />
        }
      >
        {body}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 font-normal whitespace-nowrap" title={raw}>
      {body}
    </Badge>
  );
}
