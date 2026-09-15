"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Coins } from "lucide-react";
import { TryItPanel } from "@/modules/api-docs/components/try-it-panel";
import { VariablesManager } from "@/modules/api-docs/components/variables-manager";
import { blankBaseUrlKeys, withBaseUrl } from "@/modules/api-docs/lib/base-url";
import { initialVariables, variableOptions } from "@/modules/api-docs/lib/collection-vars";
import {
  applyExchangeCode,
  requestStoragePrefix,
  requestVariableTokens,
  type LiveResponse,
} from "@/modules/api-docs/lib/execute-request";
import { asPostmanCollection, isItemGroup, normalizeRequest } from "@/modules/api-docs/lib/postman";
import { buildTree, type TreeNode } from "@/modules/api-docs/lib/tree";
import {
  readCollectionVariables,
  withCredentialExtras,
  writeCollectionVariables,
} from "@/modules/assistant/lib/collection-variables";
import {
  findMissingPrerequisites,
  findRefreshablePrerequisites,
  type MissingPrerequisite,
} from "@/modules/assistant/lib/request-dependencies";
import type {
  PostmanCollection,
  PostmanItem,
  PostmanItemGroup,
} from "@/modules/api-docs/types";

// Testing an endpoint from chat renders the ACTUAL try-it panel from
// /dashboard/api-catalogs/{id} — not a lookalike. Same request builder, same
// saved header/body edits, same response viewer with its status pill, timing,
// headers and formatted body, same variable capture.
//
// That's the point: the user sees the real response rather than a summary of
// it, and there's no second implementation to drift. An earlier version of
// this card reimplemented the send and quietly diverged in four ways (missing
// Content-Type, ignored saved edits, unpatched exchange code, no capture).
//
// The panel's own Send button is the confirmation gate — nothing fires until
// the user presses it, and a completed call spends one usage credit.

export type TestRequestResult = {
  ok: boolean;
  status?: number;
  statusText?: string;
  timeMs?: number;
  // Truncated before it goes back to the model — a large response body would
  // otherwise land in the prompt in full. The user sees the whole thing in the
  // panel regardless.
  bodyPreview?: string;
  // Set when the request depends on a variable nothing has filled in, or came
  // back 401/403 while depending on one another request can mint. Each entry
  // names the variable and the request that produces it, so the assistant can
  // offer to run that first instead of leaving the user staring at a 401.
  missingPrerequisites?: { variable: string; producedBy: string | null }[];
  // Variables the response filled in — e.g. an access_token that the next
  // request in the flow references. Tells the model the follow-up is now
  // possible rather than leaving it to guess.
  capturedVariables?: string[];
  error?: string;
};

type Prepared = {
  collection: PostmanCollection;
  item: PostmanItem;
  requestName: string;
  storagePrefix: string;
  knownVariableKeys: string[];
  baseUrl: string | null;
  extras: Record<string, string>;
  // The collection's own declared variables. Seeded like CollectionViewer does:
  // without them a declared-but-empty key (access_token) isn't even a capture
  // candidate, so the response that should fill it silently doesn't.
  defaults: Record<string, string>;
};

function findNodeByName(
  nodes: TreeNode[],
  name: string,
): { id: string; name: string; item: PostmanItem } | null {
  const wanted = name.trim().toLowerCase();
  for (const node of nodes) {
    if (node.kind === "request") {
      if (node.name.trim().toLowerCase() === wanted)
        return { id: node.id, name: node.name, item: node.item };
    } else {
      const found = findNodeByName(node.children, name);
      if (found) return found;
    }
  }
  return null;
}

// Every {{token}} referenced anywhere in the collection — the candidate set for
// capturing values out of a response, even when a different request uses them
// (request 1 returns access_token, request 2 references {{access_token}}).
//
// Uses requestVariableTokens so auth-block tokens count: eVerify declares
// {{access_token}} only under `auth`, so collecting from explicit headers alone
// left it out of the candidates and its Authenticate response never filled it.
function allVariableTokens(entries: (PostmanItem | PostmanItemGroup)[]): string[] {
  const tokens = new Set<string>();
  const visit = (nodes: (PostmanItem | PostmanItemGroup)[]) => {
    for (const entry of nodes) {
      if (isItemGroup(entry)) visit(entry.item);
      else for (const token of requestVariableTokens(entry)) tokens.add(token);
    }
  };
  visit(entries);
  return Array.from(tokens);
}

export function TestRequestCard({
  identifier,
  requestName,
  onResult,
}: {
  identifier: string;
  requestName: string;
  onResult: (result: TestRequestResult) => void;
}) {
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stored, setStored] = useState<Record<string, string>>({});
  const [variablesOpen, setVariablesOpen] = useState(false);
  // The model gets one result per tool call; a user re-sending to iterate
  // shouldn't push a second output for the same call id.
  const reported = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/assistant/catalog?identifier=${encodeURIComponent(identifier)}`,
        );
        if (!res.ok) {
          const body: unknown = await res.json().catch(() => null);
          if (!cancelled) {
            setLoadError(
              res.status === 401
                ? "Sign in to test this endpoint."
                : ((body as { message?: string } | null)?.message ?? "Couldn't load this API."),
            );
          }
          return;
        }
        const data: {
          spec: Record<string, unknown>;
          baseUrl: string | null;
          publicExtras?: Record<string, string>;
        } = await res.json();
        const collection = asPostmanCollection(data.spec);
        if (!collection) {
          if (!cancelled) setLoadError("This API's spec can't be tested from here.");
          return;
        }

        const node = findNodeByName(buildTree(collection.item), requestName);
        if (!node) {
          if (!cancelled) setLoadError(`This API has no request named "${requestName}".`);
          return;
        }

        const collectionId = collection.info._postman_id ?? collection.info.name;
        const prefix = requestStoragePrefix(collectionId, node.id);

        // eGov SSO's body carries the exchange code as a literal placeholder,
        // not a {{token}}, so it's patched into the SAVED body here — the same
        // thing TryItPanel's own sync effect does when it's mounted on the
        // docs page. Without it the freshly minted code never travels.
        const variables = readCollectionVariables(collection);
        if (variables.exchange_code) {
          try {
            const current =
              localStorage.getItem(`${prefix}:body`) ?? normalizeRequest(node.item.request).bodyRaw;
            const patched = applyExchangeCode(current, variables.exchange_code);
            if (patched !== current) localStorage.setItem(`${prefix}:body`, patched);
          } catch {
            // blocked storage — the panel still renders its own defaults
          }
        }

        if (cancelled) return;
        setStored(variables);
        setPrepared({
          collection,
          item: node.item,
          requestName: node.name,
          storagePrefix: prefix,
          knownVariableKeys: allVariableTokens(collection.item),
          baseUrl: data.baseUrl,
          extras: data.publicExtras ?? {},
          defaults: initialVariables(variableOptions(collection)),
        });
      } catch {
        if (!cancelled) setLoadError("Couldn't prepare this request.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identifier, requestName]);

  // Blank base-URL variables fill from the credential, exactly as the docs
  // page does — the spec ships without a host on purpose.
  const variables = useMemo(() => {
    if (!prepared) return stored;
    // Same precedence the docs page applies: the collection's declared
    // defaults, overridden by whatever the user saved, then blanks filled from
    // the credential (base URL, public API key).
    const merged = withCredentialExtras({ ...prepared.defaults, ...stored }, prepared.extras);
    return withBaseUrl(merged, blankBaseUrlKeys(prepared.collection), prepared.baseUrl);
  }, [prepared, stored]);

  // Which variables this request needs that nothing has filled in, and which
  // request in the same collection would produce each. This is what turns
  // "401, good luck" into "run Authenticate first".
  const missing: MissingPrerequisite[] = useMemo(() => {
    if (!prepared) return [];
    return findMissingPrerequisites({
      collection: prepared.collection,
      requestName: prepared.requestName,
      variables,
    });
  }, [prepared, variables]);

  const setVariable = useCallback(
    (key: string, value: string) => {
      if (!prepared) return;
      setStored((current) => ({ ...current, [key]: value }));
      writeCollectionVariables(prepared.collection, { [key]: value });
    },
    [prepared],
  );

  const removeVariable = useCallback(
    (key: string) => {
      if (!prepared) return;
      setStored((current) => {
        const next = { ...current };
        delete next[key];
        writeCollectionVariables(prepared.collection, next);
        return next;
      });
    },
    [prepared],
  );

  const handleResponse = useCallback(
    (live: LiveResponse, capturedVariables: string[]) => {
      if (reported.current) return;
      reported.current = true;
      const ok = live.code >= 200 && live.code < 300;

      // On 401/403 the variable may well be SET but expired — a token is the
      // usual case — so blankness isn't the right test there. Fall back to
      // "which of my inputs can another request mint?".
      const prerequisites =
        !ok && prepared
          ? live.code === 401 || live.code === 403
            ? findRefreshablePrerequisites({
                collection: prepared.collection,
                requestName: prepared.requestName,
              })
            : missing
          : [];

      onResult({
        ok,
        status: live.code,
        statusText: live.status,
        timeMs: live.timeMs,
        bodyPreview: live.body.slice(0, 2000),
        capturedVariables: capturedVariables.length > 0 ? capturedVariables : undefined,
        missingPrerequisites: prerequisites.length > 0 ? prerequisites : undefined,
      });
    },
    [onResult, prepared, missing],
  );

  if (loadError) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
        <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">{loadError}</span>
      </div>
    );
  }

  if (!prepared) {
    return (
      <div
        aria-live="polite"
        className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
      >
        Preparing the request…
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-background p-3">
      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
        <Coins aria-hidden className="mt-px size-3.5 shrink-0" />
        Sending runs against the live service and spends one usage credit.
      </p>

      {/* Said BEFORE the send, not after a wasted credit. */}
      {missing.length > 0 && (
        <p className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
          <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>
            {missing.map((entry, index) => (
              <span key={entry.variable}>
                {index > 0 && " "}
                <code className="font-mono">{`{{${entry.variable}}}`}</code> is empty
                {entry.producedBy ? (
                  <>
                    {" "}
                    — run <span className="font-medium">{entry.producedBy}</span> first to get it.
                  </>
                ) : (
                  <> — set it in the variables before sending.</>
                )}
              </span>
            ))}
          </span>
        </p>
      )}

      {/* The real thing, not a copy. */}
      <TryItPanel
        item={prepared.item}
        variables={variables}
        knownVariableKeys={prepared.knownVariableKeys}
        storagePrefix={prepared.storagePrefix}
        onVariableChange={setVariable}
        onManageVariables={() => setVariablesOpen(true)}
        onResponse={handleResponse}
      />

      <VariablesManager
        open={variablesOpen}
        onOpenChange={setVariablesOpen}
        variables={variables}
        variableOptions={variableOptions(prepared.collection)}
        knownVariableKeys={prepared.knownVariableKeys}
        baseUrlKeys={blankBaseUrlKeys(prepared.collection)}
        baseUrlHint="Generate a credential for this API to fill this in."
        onVariableChange={setVariable}
        onVariableRemove={removeVariable}
      />
    </div>
  );
}
