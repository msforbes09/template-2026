"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Eye, EyeOff, KeyRound, Link2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format-date";
import {
  generateApiCatalogCredential,
  revokeApiCatalogCredential,
} from "@/modules/site/actions/api-catalog-credentials-actions";
import type { GatewayCredential } from "@/types/gateway-credential";

// The gateway base URL rides along with the credential — it's the one field
// in the bundle that isn't a secret and is the whole reason the spec's host
// is blank, so it gets its own row instead of being buried in the generic
// key/value grid (and, in the one-time dialog, stays readable while the
// secrets are masked).
const BASE_URL_KEY = "base_url";

// eVerify's credential bundle also carries a public API key (2026-08-15
// handoff §8). Like the base URL it lives under the credential's public
// extras: not secret, and readable from this page for as long as the
// credential is active — so it must not be bucketed with the plaintext
// secrets in the one-time reveal, which are genuinely unrecoverable.
const PUBLIC_API_KEY_KEY = "public_api_key";

// Everything in the mint response that is NOT one-time secret material.
const NON_SECRET_KEYS = new Set([BASE_URL_KEY, PUBLIC_API_KEY_KEY]);

// Backend field names as display labels: "client_id" → "Client ID". The set
// of keys is per-catalog and admin-configurable, so this is a formatter, not
// a lookup table — the only special cases are initialisms that a plain
// capitalize would mangle.
const INITIALISMS: Record<string, string> = { id: "ID", url: "URL", api: "API", uuid: "UUID" };

function humanizeKey(key: string): string {
  return key
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => INITIALISMS[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function CopyValueButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={() => void copy()}
    >
      {copied ? (
        <Check aria-hidden className="size-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
    </Button>
  );
}

export function ApiCatalogCredentialManager({
  identifier,
  credential,
}: {
  identifier: string;
  credential: GatewayCredential | null;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<Record<string, string> | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, startGenerating] = useTransition();

  function handleGenerate() {
    startGenerating(async () => {
      const result = await generateApiCatalogCredential(identifier);
      if (result.ok) {
        setRevealed(result.data.credentials);
        return;
      }
      toast.error(result.message);
    });
  }

  function handleDone() {
    setRevealed(null);
    setVisible(false);
    router.refresh();
  }

  async function handleRevoke() {
    const result = await revokeApiCatalogCredential(identifier);
    if (result.ok) {
      router.refresh();
      toast.success("Credential revoked");
    } else {
      toast.error(result.message);
    }
  }

  async function copyRevealed() {
    if (!revealed) return;
    await navigator.clipboard.writeText(
      Object.entries(revealed)
        .map(([label, value]) => `${label}: ${value}`)
        .join("\n"),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const secretRows = Object.entries(credential?.secret_hint ?? {});
  const baseUrl = credential?.public?.[BASE_URL_KEY] ?? null;
  const publicRows = Object.entries(credential?.public ?? {}).filter(
    ([key]) => key !== BASE_URL_KEY,
  );

  // Same split in the one-time reveal: the base URL and the public API key are
  // both recoverable later from the credential itself, the secrets are not.
  const revealedBaseUrl = revealed?.[BASE_URL_KEY] ?? null;
  const revealedPublicApiKey = revealed?.[PUBLIC_API_KEY_KEY] ?? null;
  const revealedSecrets = Object.entries(revealed ?? {}).filter(
    ([key]) => !NON_SECRET_KEYS.has(key),
  );

  return (
    <>
      {!credential ? (
        <EmptyState
          icon={KeyRound}
          title="No credentials yet"
          description="Generate a credential to start integrating with this API — it comes with your access keys and the gateway base URL to send requests to."
          action={
            <Button className="gap-1.5" disabled={isGenerating} onClick={handleGenerate}>
              {isGenerating ? (
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
              ) : (
                <KeyRound aria-hidden className="size-3.5" />
              )}
              Generate credentials
            </Button>
          }
        />
      ) : (
        <div className="space-y-4 rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <StatusBadge active={credential.is_active === 1} />
              {credential.name && (
                <span className="text-sm font-medium text-foreground">{credential.name}</span>
              )}
            </div>
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Trash2 aria-hidden className="size-3.5" />
                  Revoke
                </Button>
              }
              title="Revoke this credential?"
              description="Any integration using it will stop working immediately. You can generate a new one afterward."
              confirmLabel="Revoke"
              destructive
              onConfirm={handleRevoke}
            />
          </div>

          {baseUrl && (
            <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Link2 aria-hidden className="size-3.5" />
                Gateway base URL
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
                  {baseUrl}
                </code>
                <CopyValueButton value={baseUrl} label="gateway base URL" />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Send gateway requests to{" "}
                <span className="font-mono">{baseUrl}/&#123;path&#125;</span>. Each call spends one
                usage credit.
              </p>
            </div>
          )}

          {(secretRows.length > 0 || publicRows.length > 0) && (
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {[...secretRows, ...publicRows].map(([label, value]) => {
                // Masked hints can't be usefully copied; the public extras
                // (a public API key above all) are exactly what a developer
                // needs to paste into their integration.
                const copyable = !(label in (credential.secret_hint ?? {}));
                return (
                  <div
                    key={label}
                    className="flex justify-between gap-3 sm:flex-col sm:justify-start"
                  >
                    <dt className="text-muted-foreground">{humanizeKey(label)}</dt>
                    <dd className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-mono text-foreground">{value}</span>
                      {copyable && (
                        <CopyValueButton value={value} label={humanizeKey(label)} />
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>Created {formatDate(credential.created_at)}</span>
            <span>
              Last used {credential.last_used_at ? formatDate(credential.last_used_at) : "Never used"}
            </span>
          </div>
        </div>
      )}

      {/* One-time plaintext reveal, locked open until "Done" is clicked —
          mirrors the account activation flow's post-generate reveal. */}
      <Dialog open={revealed != null} onOpenChange={() => {}} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your API credential</DialogTitle>
            <DialogDescription>
              Save the secrets now — for security, you won&apos;t be able to view them again. The
              base URL stays visible on this page.
            </DialogDescription>
          </DialogHeader>
          {revealed && (
            <div className="space-y-4">
              {revealedBaseUrl && (
                // Shown unmasked and outside the secret block: it's where
                // requests go, not something to hide, and it stays available
                // on this page afterward — only the plaintext secrets below
                // are one-time.
                <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Link2 aria-hidden className="size-3.5" />
                    Gateway base URL
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
                      {revealedBaseUrl}
                    </code>
                    <CopyValueButton value={revealedBaseUrl} label="gateway base URL" />
                  </div>
                </div>
              )}
              {revealedPublicApiKey && (
                // Also outside the secret block, and for the same reason: it's
                // public by name and stays readable on this page afterward.
                <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <KeyRound aria-hidden className="size-3.5" />
                    Public API key
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
                      {revealedPublicApiKey}
                    </code>
                    <CopyValueButton value={revealedPublicApiKey} label="public API key" />
                  </div>
                </div>
              )}
              {/* Guarded: a catalog whose bundle is nothing but a base URL
                  would otherwise render an empty box with a Show toggle
                  over no secrets. Copy still takes the whole bundle. */}
              {revealedSecrets.length > 0 && (
                <>
                  <Textarea
                    readOnly
                    value={revealedSecrets
                      .map(
                        ([label, value]) =>
                          `${label}: ${visible ? value : "•".repeat(value.length)}`,
                      )
                      .join("\n")}
                    rows={revealedSecrets.length + 1}
                    aria-label={
                      visible ? "Generated API credential" : "Generated API credential, hidden"
                    }
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
                      onClick={() => void copyRevealed()}
                    >
                      {copied ? (
                        <Check
                          aria-hidden
                          className="size-3.5 text-emerald-600 dark:text-emerald-400"
                        />
                      ) : (
                        <Copy aria-hidden className="size-3.5" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </>
              )}
              <Button type="button" className="w-full" onClick={handleDone}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
