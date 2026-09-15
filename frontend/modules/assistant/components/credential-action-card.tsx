"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, KeyRound, Loader2, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { asPostmanCollection } from "@/modules/api-docs/lib/postman";
import { CatalogVariablesCard } from "@/modules/assistant/components/catalog-variables-card";
import {
  matchCredentialToVariables,
  writeCollectionVariables,
} from "@/modules/assistant/lib/collection-variables";
import {
  generateApiCatalogCredential,
  revokeApiCatalogCredential,
} from "@/modules/site/actions/api-catalog-credentials-actions";

// Generating or revoking a credential, confirmed in the chat.
//
// THE POINT OF THIS COMPONENT: a mint returns plaintext secret material
// exactly once. A tool's output becomes permanent message history that is
// replayed to the model on every following turn, so putting the secret there
// would hand it to the model forever and bake it into the transcript. Instead
// the secret is rendered HERE, for the human, and `onResult` returns only a
// non-secret acknowledgement.
//
// Read that as the invariant it is: nothing in this file may pass a value from
// `credentials` into onResult.

export type CredentialActionResult = {
  ok: boolean;
  action: "generate" | "revoke";
  identifier: string;
  // Non-secret and useful to the model — it's the address requests go to.
  baseUrl?: string | null;
  // Names only, so the model can say "your client ID and secret are shown
  // above" without ever holding the values.
  fieldNames?: string[];
  error?: string;
};

function humanizeKey(key: string): string {
  const initialisms: Record<string, string> = { id: "ID", url: "URL", api: "API", uuid: "UUID" };
  return key
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => initialisms[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={copied ? "Copied" : "Copy value"}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
    </Button>
  );
}

export function CredentialActionCard({
  identifier,
  action,
  onResult,
}: {
  identifier: string;
  action: "generate" | "revoke";
  onResult: (result: CredentialActionResult) => void;
}) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Held in component state only. Never lifted, never persisted, never sent to
  // the model — it dies with the message list on reload, exactly like the
  // existing one-time reveal dialog.
  const [secrets, setSecrets] = useState<Record<string, string> | null>(null);
  // Shown alongside them for convenience. Not secret, and unlike the rest it
  // stays readable on the API's Credentials tab afterwards.
  const [revealedBaseUrl, setRevealedBaseUrl] = useState<string | null>(null);
  // Names of the test variables the minted fields would fill, once known.
  // Empty array means "checked, nothing matched"; null means "not checked yet".
  const [fillable, setFillable] = useState<string[] | null>(null);
  const [filled, setFilled] = useState(false);
  // Whether the variables editor is open below. Set once the fill has run, so
  // the editor mounts against the values that were just written rather than
  // reading localStorage a moment too early and showing the old ones.
  const [showVariables, setShowVariables] = useState(false);

  // Writes the freshly minted values into the collection variables the docs'
  // Test tab reads, so the user can go straight to testing instead of
  // copy-pasting a secret they only get to see once. Has to happen here, while
  // the plaintext is still in hand — nothing can recover it afterwards.
  //
  // Takes the fields as an argument rather than reading `secrets` from state:
  // this runs in the same tick as the mint, before that state has been applied.
  async function fillTestVariables(fields: Record<string, string>) {
    try {
      const res = await fetch(`/api/assistant/catalog?identifier=${encodeURIComponent(identifier)}`);
      if (!res.ok) {
        setFillable([]);
        return;
      }
      const data: { spec: Record<string, unknown> } = await res.json();
      const collection = asPostmanCollection(data.spec);
      if (!collection) {
        setFillable([]);
        return;
      }

      const patch = matchCredentialToVariables(collection, fields);
      if (Object.keys(patch).length === 0) {
        setFillable([]);
        return;
      }
      writeCollectionVariables(collection, patch);
      setFillable(Object.keys(patch));
      setFilled(true);
    } catch {
      setFillable([]);
    }
  }

  async function run() {
    setRunning(true);
    setError(null);
    try {
      if (action === "revoke") {
        const result = await revokeApiCatalogCredential(identifier);
        setDone(true);
        if (result.ok) {
          onResult({ ok: true, action, identifier });
        } else {
          setError(result.message);
          onResult({ ok: false, action, identifier, error: result.message });
        }
        return;
      }

      const result = await generateApiCatalogCredential(identifier);
      setDone(true);
      if (!result.ok) {
        setError(result.message);
        onResult({ ok: false, action, identifier, error: result.message });
        return;
      }

      const { credentials } = result.data;
      const baseUrl = credentials.base_url ?? null;
      // Everything except the base URL is one-time secret material.
      const secretEntries = Object.entries(credentials).filter(([key]) => key !== "base_url");
      setSecrets(Object.fromEntries(secretEntries));
      setRevealedBaseUrl(baseUrl);

      onResult({
        ok: true,
        action,
        identifier,
        baseUrl,
        fieldNames: secretEntries.map(([key]) => key),
      });

      // Fill, then open the editor — always, not as an offer. A freshly minted
      // credential makes whatever was in these variables dead, and the values
      // are only in reach for this one render, so leaving it to a button (or to
      // the model remembering to offer it) meant the common case was a user
      // pasting a secret they had one chance to copy.
      await fillTestVariables({
        ...Object.fromEntries(secretEntries),
        ...(baseUrl ? { base_url: baseUrl } : {}),
      });
      setShowVariables(true);
    } catch {
      const message = "The request failed. Please try again.";
      setDone(true);
      setError(message);
      onResult({ ok: false, action, identifier, error: message });
    } finally {
      setRunning(false);
    }
  }

  if (secrets) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
        <p className="flex items-start gap-1.5 text-xs font-medium">
          <KeyRound aria-hidden className="mt-px size-3.5 shrink-0" />
          Credential created for {identifier}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Copy these now. The API returns them once and there is no way to read
          them again — not here, not on the API&apos;s Credentials tab. They
          survive closing this panel, but not a page refresh; if you lose them,
          revoke the credential and generate a new one.
        </p>
        <dl className="flex flex-col gap-1.5">
          {revealedBaseUrl && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] text-muted-foreground">Gateway base URL</dt>
              <dd className="flex items-center gap-1">
                <code className="min-w-0 flex-1 truncate rounded border border-border bg-background px-1.5 py-1 font-mono text-[11px]">
                  {revealedBaseUrl}
                </code>
                <CopyButton value={revealedBaseUrl} />
              </dd>
            </div>
          )}
          {Object.entries(secrets).map(([key, value]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <dt className="text-[11px] text-muted-foreground">{humanizeKey(key)}</dt>
              <dd className="flex items-center gap-1">
                <code className="min-w-0 flex-1 truncate rounded border border-border bg-background px-1.5 py-1 font-mono text-[11px]">
                  {value}
                </code>
                <CopyButton value={value} />
              </dd>
            </div>
          ))}
        </dl>

        {/* Happens here rather than in a follow-up, because the values stop
            existing the moment this card loses them. */}
        {filled ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Check aria-hidden className="mt-px size-3.5 shrink-0" />
            Saved into this API&apos;s test variables ({fillable?.join(", ")}). Check
            them below — you can test its endpoints straight away.
          </p>
        ) : fillable?.length === 0 ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Wand2 aria-hidden className="mt-px size-3.5 shrink-0" />
            This API&apos;s collection declares no matching variables, so nothing was
            filled in automatically — copy the values into the fields below.
          </p>
        ) : (
          <p aria-live="polite" className="text-xs text-muted-foreground">
            Saving these into the API&apos;s test variables…
          </p>
        )}

        {showVariables && (
          // Mounted after the fill so it reads the new values, and unconditional
          // so there is always somewhere to put a secret that cannot be shown
          // twice. No onResult: this is not answering a tool call, so there is
          // nothing to hand back to the model.
          <CatalogVariablesCard identifier={identifier} />
        )}
      </div>
    );
  }

  if (error) {
    return (
      <p className="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
        {error}
      </p>
    );
  }

  if (done) {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {action === "revoke"
          ? `Credential for ${identifier} revoked.`
          : `Credential for ${identifier} created.`}
      </p>
    );
  }

  const destructive = action === "revoke";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="flex items-start gap-1.5 text-xs leading-relaxed">
        {destructive ? (
          <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0 text-destructive" />
        ) : (
          <KeyRound aria-hidden className="mt-px size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className={destructive ? "text-destructive" : "text-muted-foreground"}>
          {destructive ? (
            <>
              Revoke your <span className="font-medium">{identifier}</span> credential? Anything
              using it stops working immediately. You can generate a new one afterwards.
            </>
          ) : (
            <>
              Generate a gateway credential for <span className="font-medium">{identifier}</span>?
              The secret is shown once, here, and can&apos;t be retrieved later.
            </>
          )}
        </span>
      </p>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant={destructive ? "outline" : "default"}
          className={destructive ? "gap-1.5 text-destructive" : "gap-1.5"}
          disabled={running}
          onClick={run}
        >
          {running ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : destructive ? (
            <Trash2 aria-hidden className="size-3.5" />
          ) : (
            <KeyRound aria-hidden className="size-3.5" />
          )}
          {destructive ? "Revoke" : "Generate"}
        </Button>
      </div>
    </div>
  );
}
