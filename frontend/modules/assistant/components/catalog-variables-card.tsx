"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { asPostmanCollection } from "@/modules/api-docs/lib/postman";
import {
  declaredVariableKeys,
  readCollectionVariables,
  writeCollectionVariables,
} from "@/modules/assistant/lib/collection-variables";
import type { PostmanCollection } from "@/modules/api-docs/types";

// Edits one API's test variables from inside the chat — the same store the
// docs' Variables panel owns, so a value set here works there and vice versa.
//
// The model never sees a value. It asks for the editor by identifier, the user
// types into it, and the result reported back is only which names were saved.
// That matters because these hold client secrets in plaintext.

export type CatalogVariablesResult = {
  ok: boolean;
  identifier: string;
  savedKeys?: string[];
  error?: string;
};

// Anything whose name suggests secret material is masked by default. A
// heuristic on purpose: the variable set is per-catalog and admin-authored, so
// there's no fixed list to check against.
function isSensitive(key: string): boolean {
  return /secret|password|token|key|code/i.test(key);
}

export function CatalogVariablesCard({
  identifier,
  onResult,
}: {
  identifier: string;
  // Omitted when the editor is embedded rather than answering a
  // manageCatalogVariables call — CredentialActionCard opens it directly after
  // a mint, where there is no tool call waiting on a result.
  onResult?: (result: CatalogVariablesResult) => void;
}) {
  const [collection, setCollection] = useState<PostmanCollection | null>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/assistant/catalog?identifier=${encodeURIComponent(identifier)}`,
        );
        if (!res.ok) {
          if (!cancelled) {
            setLoadError(
              res.status === 401
                ? "Sign in to edit this API's test variables."
                : "Couldn't load this API.",
            );
          }
          return;
        }
        const data: { spec: Record<string, unknown> } = await res.json();
        const parsed = asPostmanCollection(data.spec);
        if (!parsed) {
          if (!cancelled) setLoadError("This API's spec doesn't declare test variables.");
          return;
        }

        const declared = declaredVariableKeys(parsed);
        const stored = readCollectionVariables(parsed);
        // Stored keys the collection no longer declares are still shown — they
        // were set for a reason and silently hiding them would look like data
        // loss.
        const extra = Object.keys(stored).filter((key) => !declared.includes(key));
        const all = [...declared, ...extra];

        if (cancelled) return;
        if (all.length === 0) {
          setLoadError("This API doesn't use any test variables.");
          return;
        }
        setCollection(parsed);
        setKeys(all);
        setValues(Object.fromEntries(all.map((key) => [key, stored[key] ?? ""])));
      } catch {
        if (!cancelled) setLoadError("Couldn't load this API's test variables.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identifier]);

  function save() {
    if (!collection) return;
    writeCollectionVariables(collection, values);
    setSaved(true);
    // Names only — never the values.
    onResult?.({ ok: true, identifier, savedKeys: Object.keys(values) });
  }

  if (loadError) {
    return (
      <p className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
        {loadError}
      </p>
    );
  }

  if (!collection) {
    return (
      <p aria-live="polite" className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Loading test variables…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Test variables for <span className="font-medium">{identifier}</span>. These
        fill the <code className="font-mono">{"{{tokens}}"}</code> in its example
        requests and are stored in this browser only.
      </p>

      <div className="flex flex-col gap-2">
        {keys.map((key) => {
          const sensitive = isSensitive(key);
          const shown = revealed[key] ?? !sensitive;
          return (
            <div key={key} className="flex flex-col gap-1">
              <label htmlFor={`var-${identifier}-${key}`} className="text-[11px] text-muted-foreground">
                {key}
              </label>
              <div className="flex items-center gap-1">
                <Input
                  id={`var-${identifier}-${key}`}
                  type={shown ? "text" : "password"}
                  value={values[key] ?? ""}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-8 font-mono text-xs"
                  onChange={(event) => {
                    // Read the value HERE, not inside the updater below. React
                    // nulls event.currentTarget once the handler returns, and a
                    // functional updater runs later, during the render pass —
                    // so reading it there threw "Cannot read properties of null
                    // (reading 'value')" on the first keystroke. Being outside
                    // the handler, the throw also escaped to the error
                    // boundary, so the whole page became "Something went wrong"
                    // rather than the field misbehaving.
                    const next = event.currentTarget.value;
                    setSaved(false);
                    setValues((current) => ({ ...current, [key]: next }));
                  }}
                />
                {sensitive && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={shown ? `Hide ${key}` : `Show ${key}`}
                    onClick={() => setRevealed((current) => ({ ...current, [key]: !shown }))}
                  >
                    {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check aria-hidden className="size-3.5" />
            Saved
          </span>
        )}
        <Button size="sm" className="gap-1.5" disabled={saved} onClick={save}>
          <Save aria-hidden className="size-3.5" />
          Save
        </Button>
      </div>
    </div>
  );
}
