"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ApiCatalogCredentialSet } from "@/types/api-catalog-credentials";

function formatCredentials(credentialSets: ApiCatalogCredentialSet[], mask: boolean): string {
  return credentialSets
    .map((set) => {
      const lines = Object.entries(set.credentials).map(
        ([label, value]) => `${label}: ${mask ? "•".repeat(value.length) : value}`,
      );
      return [set.name ?? "API catalog", ...lines].join("\n");
    })
    .join("\n\n");
}

export function ApiCatalogCredentialsView({
  credentialSets,
  onDone,
}: {
  credentialSets: ApiCatalogCredentialSet[];
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // The textarea only ever shows the masked or revealed text depending on
  // `visible` — the real values are recomputed here so "Copy all" always
  // copies them regardless of what's currently displayed.
  const displayText = useMemo(
    () => formatCredentials(credentialSets, !visible),
    [credentialSets, visible],
  );

  async function copyAll() {
    await navigator.clipboard.writeText(formatCredentials(credentialSets, false));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <Textarea
        readOnly
        value={displayText}
        rows={10}
        aria-label={visible ? "Generated API credentials" : "Generated API credentials, hidden"}
        className="font-mono text-sm whitespace-pre-wrap break-all"
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOff aria-hidden className="size-3.5" />
          ) : (
            <Eye aria-hidden className="size-3.5" />
          )}
          {visible ? "Hide" : "Show"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => void copyAll()}
        >
          {copied ? (
            <Check aria-hidden className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy aria-hidden className="size-3.5" />
          )}
          {copied ? "Copied all" : "Copy all"}
        </Button>
      </div>

      <Button type="button" className="w-full" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
