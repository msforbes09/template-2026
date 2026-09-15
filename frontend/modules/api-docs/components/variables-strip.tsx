"use client";

import { Braces } from "lucide-react";
import { Button } from "@/components/ui/button";

// Read-only "which {{variables}} does this use, and what do they resolve to"
// strip. Shared by the Try-it panel (the request's URL/headers/body) and the
// extension cards that take a {{variable}} reference (Face Liveness's public
// key). Editing happens in the collection-level VariablesManager, which
// `onManageVariables` opens. Renders nothing when there are no tokens.
export function VariablesStrip({
  tokens,
  variables,
  onManageVariables,
  title = "Variables in this request",
}: {
  tokens: string[];
  variables: Record<string, string>;
  onManageVariables?: () => void;
  title?: string;
}) {
  if (tokens.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {onManageVariables && (
          <Button variant="ghost" size="xs" className="gap-1" onClick={onManageVariables}>
            <Braces aria-hidden className="size-3" />
            Manage variables
          </Button>
        )}
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {tokens.map((key) => {
          const value = variables[key];
          const isSet = value !== undefined && value !== "";
          return (
            <div
              key={key}
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
            >
              <span className="w-32 shrink-0 truncate font-mono text-xs font-medium text-primary">
                {`{{${key}}}`}
              </span>
              {isSet ? (
                <span className="truncate font-mono text-xs text-muted-foreground" title={value}>
                  {value}
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Not set
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
