"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeBlock } from "@/modules/api-docs/components/code-block";
import { KvTable } from "@/modules/api-docs/components/kv-table";
import { MethodBadge } from "@/modules/api-docs/components/method-badge";
import { StatusPill } from "@/modules/api-docs/components/status-pill";
import { VariablesStrip } from "@/modules/api-docs/components/variables-strip";
import { QuotaExceededNotice } from "@/modules/gateway-quota/components/quota-exceeded-notice";
import {
  captureVariablesFromResponse,
  collectVariableTokens,
  normalizeRequest,
  prettyJson,
  replaceJsonStringValue,
  substituteVariables,
} from "@/modules/api-docs/lib/postman";
import {
  buildRequestPlan,
  executeRequestPlan,
  initialHeaders,
  type HeaderRow,
  type LiveResponse,
} from "@/modules/api-docs/lib/execute-request";
import { usePersistentValue } from "@/modules/api-docs/lib/use-persistent-value";
import type { PostmanItem } from "@/modules/api-docs/types";

const COMMON_HEADER_KEYS = [
  "Accept",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Content-Type",
  "Cookie",
  "If-Match",
  "If-None-Match",
  "Origin",
  "Referer",
  "User-Agent",
  "X-Api-Key",
  "X-Correlation-Id",
  "X-CSRF-Token",
  "X-Requested-With",
];


export function TryItPanel({
  item,
  variables,
  knownVariableKeys,
  storagePrefix,
  onVariableChange,
  onManageVariables,
  onResponse,
}: {
  item: PostmanItem;
  variables: Record<string, string>;
  // Every {{token}} referenced anywhere in the collection — candidates for
  // capture from a successful response, even if another request uses them.
  knownVariableKeys: string[];
  // Per-collection-and-request localStorage namespace for body/header edits.
  storagePrefix: string;
  // Called on response capture; editing lives in the collection-level
  // VariablesManager since variables are shared across requests.
  onVariableChange: (key: string, value: string) => void;
  onManageVariables: () => void;
  // Observes each completed send. Added for the assistant's test card, which
  // renders this panel inside a chat message and has to report the outcome
  // back to the model — the panel itself stays the source of truth for what
  // was sent and what came back. Called AFTER variable capture, with the keys
  // that changed, so a host learns the complete outcome rather than a
  // half-finished one.
  onResponse?: (live: LiveResponse, capturedVariables: string[]) => void;
}) {
  const request = useMemo(() => normalizeRequest(item.request), [item]);
  const headerKeyListId = useId();

  const headerKeySuggestions = useMemo(() => {
    const fromRequest = initialHeaders(item).map((row) => row.key);
    return Array.from(new Set([...fromRequest, ...COMMON_HEADER_KEYS])).filter(Boolean);
  }, [item]);

  const [url, setUrl] = useState(request.urlRaw);

  // Body and header edits persist per request in this browser only. Headers
  // are stored as JSON; the snapshot is the string, so parsing is memoized
  // on it to keep the array reference stable across renders.
  const [body, setBody, clearBody] = usePersistentValue(`${storagePrefix}:body`, request.bodyRaw);
  const defaultHeadersJson = useMemo(() => JSON.stringify(initialHeaders(item)), [item]);
  const [headersJson, setHeadersJson, clearHeaders] = usePersistentValue(
    `${storagePrefix}:headers`,
    defaultHeadersJson,
  );
  const headers = useMemo<HeaderRow[]>(() => {
    try {
      const parsed: unknown = JSON.parse(headersJson);
      if (Array.isArray(parsed)) {
        return parsed.map((row) => ({
          key: String((row as Partial<HeaderRow>)?.key ?? ""),
          value: String((row as Partial<HeaderRow>)?.value ?? ""),
        }));
      }
    } catch {
      // corrupted entry — fall through to the documented defaults
    }
    return initialHeaders(item);
  }, [headersJson, item]);

  function setHeaders(next: HeaderRow[]) {
    setHeadersJson(JSON.stringify(next));
  }

  // Seeds this request's exchange_code field the moment a *new* code is
  // generated (see ExchangeCodeGenerator/CollectionViewer) — a one-time
  // sync, not a live binding, so it never fights a manual edit to the field
  // afterward. No-ops for every other request, since the key is only
  // present in a body that documents it. Persisted (not a plain ref) since
  // this panel remounts on every tab switch (keyed by selected.id in
  // CollectionViewer) — an in-memory guard would forget it already synced
  // and re-clobber a manual edit as soon as the user came back.
  const [syncedExchangeCode, setSyncedExchangeCode, clearSyncedExchangeCode] = usePersistentValue(
    `${storagePrefix}:syncedExchangeCode`,
    "",
  );
  useEffect(() => {
    const code = variables.exchange_code;
    if (!code || code === syncedExchangeCode) return;
    setSyncedExchangeCode(code);
    const patched = replaceJsonStringValue(body, "exchange_code", code);
    if (patched !== body) setBody(patched);
  }, [variables.exchange_code, syncedExchangeCode, setSyncedExchangeCode, body, setBody]);

  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<LiveResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [capturedKeys, setCapturedKeys] = useState<string[]>([]);

  // Tokens this request actually references — shown read-only here; editing
  // happens in the collection-level VariablesManager.
  const requestTokens = useMemo(
    () => collectVariableTokens(url, body, ...headers.map((row) => `${row.key} ${row.value}`)),
    [url, body, headers],
  );

  const resolvedUrl = substituteVariables(url, variables);

  function reset() {
    setUrl(request.urlRaw);
    // Drop the saved edits so the documented defaults show again.
    clearHeaders();
    clearBody();
    clearSyncedExchangeCode();
    setResponse(null);
    setSendError(null);
    setCapturedKeys([]);
  }

  function updateHeader(index: number, patch: Partial<HeaderRow>) {
    setHeaders(headers.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function send() {
    setSending(true);
    setSendError(null);
    setResponse(null);
    setCapturedKeys([]);
    try {
      // Resolution and the call itself live in lib/execute-request so the
      // assistant's test card sends a byte-identical request — see the note
      // there. The URL comes from the panel's own (editable) `url` state
      // rather than the item, which is the one thing that differs.
      const plan = buildRequestPlan({ item, variables, headers, body });
      const live = await executeRequestPlan({ ...plan, url: resolvedUrl });
      const text = live.body;
      setResponse(live);
      const changed: string[] = [];
      if (live.code >= 200 && live.code < 300) {
        // Persist matching response values into variables (e.g. a returned
        // access_token fills {{accessToken}} for the next request).
        const candidates = Array.from(new Set([...knownVariableKeys, ...Object.keys(variables)]));
        const captured = captureVariablesFromResponse(text, candidates);
        for (const [key, value] of Object.entries(captured)) {
          if (variables[key] !== value) {
            onVariableChange(key, value);
            changed.push(key);
          }
        }
        setCapturedKeys(changed);
      }
      // After capture, so `changed` is final.
      onResponse?.(live, changed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSendError(
        `${message}. The request never reached a response — this is usually a network error, an unresolved {{variable}} in the URL, or the API blocking cross-origin (CORS) requests from the browser.`,
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <VariablesStrip
        tokens={requestTokens}
        variables={variables}
        onManageVariables={onManageVariables}
      />

      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Request
        </h3>
        <div className="flex items-center gap-2">
          <MethodBadge method={request.method} />
          <Input
            aria-label="Request URL"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-9 flex-1 font-mono text-xs"
          />
          <Button disabled={sending} onClick={() => void send()} className="gap-1.5">
            {sending ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Send aria-hidden className="size-4" />
            )}
            Send
          </Button>
        </div>
        {resolvedUrl !== url && (
          <p className="truncate font-mono text-xs text-muted-foreground" title={resolvedUrl}>
            → {resolvedUrl}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Headers
          </h3>
          <Button
            variant="ghost"
            size="xs"
            className="gap-1"
            onClick={() => setHeaders([...headers, { key: "", value: "" }])}
          >
            <Plus aria-hidden className="size-3" />
            Add header
          </Button>
        </div>
        <datalist id={headerKeyListId}>
          {headerKeySuggestions.map((key) => (
            <option key={key} value={key} />
          ))}
        </datalist>
        {headers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No headers.</p>
        ) : (
          <div className="space-y-2">
            {headers.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  aria-label={`Header ${index + 1} key`}
                  value={row.key}
                  placeholder="Key"
                  list={headerKeyListId}
                  onChange={(event) => updateHeader(index, { key: event.target.value })}
                  className="h-8 w-56 font-mono text-xs"
                />
                <Input
                  aria-label={`Header ${index + 1} value`}
                  value={row.value}
                  placeholder="Value"
                  onChange={(event) => updateHeader(index, { value: event.target.value })}
                  className="h-8 flex-1 font-mono text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove header ${row.key || index + 1}`}
                  onClick={() => setHeaders(headers.filter((_, i) => i !== index))}
                >
                  <Trash2 aria-hidden className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {!["GET", "HEAD"].includes(request.method) && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Body
          </h3>
          <textarea
            aria-label="Request body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full rounded-xl border border-input bg-transparent p-3 font-mono text-xs leading-relaxed focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </section>
      )}

      <div>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={reset}>
          <RotateCcw aria-hidden className="size-3.5" />
          Reset to documented request
        </Button>
      </div>

      {sendError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>{sendError}</p>
        </div>
      )}

      {response && (
        <section className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Response
            </h3>
            <StatusPill code={response.code} status={response.status} />
            <span className="text-xs text-muted-foreground">{response.timeMs} ms</span>
            <span className="text-xs text-muted-foreground">
              {response.sizeBytes < 1024
                ? `${response.sizeBytes} B`
                : `${(response.sizeBytes / 1024).toFixed(1)} KB`}
            </span>
          </div>
          {capturedKeys.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Saved to variables:{" "}
              {capturedKeys.map((key, i) => (
                <span key={key}>
                  {i > 0 && ", "}
                  <span className="font-mono font-semibold text-primary">{`{{${key}}}`}</span>
                </span>
              ))}
            </p>
          )}
          <QuotaExceededNotice statusCode={response.code} body={response.body} />
          <CodeBlock label="Response body" code={prettyJson(response.body) || "(empty body)"} />
          {response.headers.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none hover:text-foreground">
                Response headers ({response.headers.length})
              </summary>
              <div className="pt-2">
                <KvTable ariaLabel="Live response headers" rows={response.headers} />
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
