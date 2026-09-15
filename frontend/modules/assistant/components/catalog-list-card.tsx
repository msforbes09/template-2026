"use client";

import { BookOpen, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogListItem } from "@/modules/assistant/lib/tool-output";

// The result of showApiCatalogs, rendered as buttons rather than left as prose.
//
// Clicking one doesn't jump straight into a request: it asks the assistant to
// test that API, which puts the model back at step 0 of the testing order —
// endpoint picker, credential check, prerequisite, then the request. Skipping
// that by wiring the button directly to a test would route around the checks
// that stop a doomed or wrongly-targeted call.
//
// Signed out there is no testing order to enter, so the same list offers what
// it can actually deliver: the documentation. `canTest` comes from the tool
// output because the server decides it from the session — see makeShowApiCatalogs.

export function CatalogListCard({
  catalogs,
  canTest,
  onPick,
}: {
  catalogs: CatalogListItem[];
  canTest: boolean;
  onPick: (catalog: CatalogListItem) => void;
}) {
  if (catalogs.length === 0) return null;

  const Icon = canTest ? FlaskConical : BookOpen;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon aria-hidden className="size-3.5" />
        {canTest ? "Pick one to test it" : "Pick one to see its documentation"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {catalogs.map((catalog) => (
          <Button
            key={catalog.identifier}
            variant="outline"
            size="sm"
            className="h-auto py-1.5 text-xs font-normal"
            onClick={() => onPick(catalog)}
          >
            {catalog.name ?? catalog.identifier}
          </Button>
        ))}
      </div>
    </div>
  );
}
