"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MethodBadge } from "@/modules/api-docs/components/method-badge";
import { asPostmanCollection } from "@/modules/api-docs/lib/postman";
import { buildTree, type TreeNode } from "@/modules/api-docs/lib/tree";

// "Which API do you want to test?" as buttons rather than a prose question the
// user has to answer by typing an identifier they may not know.
//
// Two stages in one card: pick the API, then pick the endpoint. The endpoint
// stage matters as much as the first — a collection has several requests and
// letting the model guess which one the user meant is how you end up spending
// a usage credit on the wrong call.
//
// Both lists come from the real spec, never from the model, so nothing here
// can offer an endpoint that doesn't exist.

export type ChooseTestTargetResult = {
  identifier: string;
  requestName: string;
  // Carried through so the model can name it without a second lookup.
  method: string;
};

type Catalog = { identifier: string; name: string | null; description: string | null };
type Endpoint = { name: string; method: string };

function flattenEndpoints(nodes: TreeNode[], out: Endpoint[] = []): Endpoint[] {
  for (const node of nodes) {
    if (node.kind === "request") out.push({ name: node.name, method: node.method });
    else flattenEndpoints(node.children, out);
  }
  return out;
}

export function ChooseTestTargetCard({
  initialIdentifier,
  justTested,
  onResult,
}: {
  // Set when the user already named the API — skips straight to the endpoint
  // stage instead of asking something they've answered.
  initialIdentifier?: string;
  // Marked as already run, but still selectable — re-testing after changing a
  // variable is a normal thing to want.
  justTested?: string;
  onResult: (result: ChooseTestTargetResult) => void;
}) {
  const [catalogs, setCatalogs] = useState<Catalog[] | null>(null);
  const [identifier, setIdentifier] = useState<string | null>(initialIdentifier ?? null);
  const [endpoints, setEndpoints] = useState<Endpoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<ChooseTestTargetResult | null>(null);

  // Stage 1 list. Skipped when an identifier was supplied, but still fetched
  // so the "change API" affordance below works without a round trip.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/assistant/catalogs");
        const data: { catalogs: Catalog[] } = await res.json();
        if (!cancelled) setCatalogs(data.catalogs);
      } catch {
        if (!cancelled) setCatalogs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Stage 2 list, from the chosen API's actual spec.
  useEffect(() => {
    if (!identifier) return;
    let cancelled = false;

    // No synchronous setState here — the reset belongs to whatever changed
    // `identifier`, and doing it in the effect body triggers a cascading
    // render the React Compiler rightly complains about.
    (async () => {
      try {
        const res = await fetch(
          `/api/assistant/catalog?identifier=${encodeURIComponent(identifier)}`,
        );
        if (!res.ok) {
          if (!cancelled) {
            setError(
              res.status === 401
                ? "Sign in to test an endpoint."
                : "Couldn't load this API's endpoints.",
            );
          }
          return;
        }
        const data: { spec: Record<string, unknown> } = await res.json();
        const collection = asPostmanCollection(data.spec);
        if (!collection) {
          if (!cancelled) setError("This API's spec can't be tested from here.");
          return;
        }
        const list = flattenEndpoints(buildTree(collection.item));
        if (!cancelled) {
          if (list.length === 0) setError("This API doesn't expose any testable requests.");
          else setEndpoints(list);
        }
      } catch {
        if (!cancelled) setError("Couldn't load this API's endpoints.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identifier]);

  if (chosen) {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Selected <span className="font-medium text-foreground">{chosen.requestName}</span> on{" "}
        <span className="font-medium text-foreground">{chosen.identifier}</span>.
      </p>
    );
  }

  if (error) {
    return (
      <p className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
        {error}
      </p>
    );
  }

  // ── Stage 2: pick an endpoint ────────────────────────────────────────────
  if (identifier) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {!initialIdentifier && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Choose a different API"
              onClick={() => {
                setIdentifier(null);
                setEndpoints(null);
                setError(null);
              }}
            >
              <ChevronLeft aria-hidden />
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            {justTested ? "Test another endpoint of " : "Which endpoint of "}
            <span className="font-medium text-foreground">{identifier}</span>?
          </p>
        </div>

        {!endpoints ? (
          <p aria-live="polite" className="text-xs text-muted-foreground">
            Loading endpoints…
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {endpoints.map((endpoint) => (
              <Button
                key={endpoint.name}
                variant="outline"
                size="sm"
                className="h-auto justify-start gap-2 py-1.5 text-left text-xs font-normal"
                onClick={() => {
                  const result = { identifier, requestName: endpoint.name, method: endpoint.method };
                  setChosen(result);
                  onResult(result);
                }}
              >
                <MethodBadge method={endpoint.method} />
                <span className="min-w-0 truncate">{endpoint.name}</span>
                {justTested?.trim().toLowerCase() === endpoint.name.trim().toLowerCase() && (
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">tested</span>
                )}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Stage 1: pick an API ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">Which API do you want to test?</p>
      {!catalogs ? (
        <p aria-live="polite" className="text-xs text-muted-foreground">
          Loading APIs…
        </p>
      ) : catalogs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No APIs are published right now.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {catalogs.map((catalog) => (
            <Button
              key={catalog.identifier}
              variant="outline"
              size="sm"
              className="h-auto py-1.5 text-xs font-normal"
              onClick={() => {
                setEndpoints(null);
                setError(null);
                setIdentifier(catalog.identifier);
              }}
            >
              {catalog.name ?? catalog.identifier}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
