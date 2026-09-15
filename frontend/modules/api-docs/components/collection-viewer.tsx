"use client";

import { useMemo, useState } from "react";
import { BookOpen, Braces, FlaskConical, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Markdown } from "@/components/ui/markdown";
import { env } from "@/lib/env";
import { RequestDoc } from "@/modules/api-docs/components/request-doc";
import { SidebarTree } from "@/modules/api-docs/components/sidebar-tree";
import { TryItPanel } from "@/modules/api-docs/components/try-it-panel";
import { VariablesManager } from "@/modules/api-docs/components/variables-manager";
import { ExchangeCodeGenerator } from "@/modules/site/components/exchange-code-generator";
import { FaceLivenessSessionGenerator } from "@/modules/site/components/face-liveness-session-generator";
import { blankBaseUrlKeys, withBaseUrl } from "@/modules/api-docs/lib/base-url";
import {
  collectVariableTokens,
  getAuthHeader,
  getDescriptionText,
  normalizeRequest,
} from "@/modules/api-docs/lib/postman";
import { buildTree, findRequest, firstRequest, type TreeNode } from "@/modules/api-docs/lib/tree";
import { initialVariables, variableOptions } from "@/modules/api-docs/lib/collection-vars";
import { usePersistentVariables } from "@/modules/api-docs/lib/use-persistent-variables";
import type { PostmanCollection } from "@/modules/api-docs/types";

export function CollectionViewer({
  collection,
  exchangeCodeGeneratorRequests = [],
  faceLivenessSessionGeneratorRequests = [],
  baseUrl,
  baseUrlNotice,
  interactive = true,
}: {
  collection: PostmanCollection;
  // Requests whose documentation ExchangeCodeGenerator renders above (see
  // lib/catalog-meta.ts's getMetaExtensionShows), wiring its result into that
  // request's Test-tab body via the variables system below — kept as plain
  // names (not pre-built elements) so this Client Component can still supply
  // the live onGenerated callback itself.
  //
  // A LIST because one extension can be placed above several requests: it is
  // declared once per placement in meta.extensions.
  exchangeCodeGeneratorRequests?: string[];
  // Same mechanism, for FaceLivenessSessionGenerator
  // (FACE_LIVENESS_SESSION_GENERATOR_EXTENSION) — independent of the above, so
  // both can coexist stacked over the same request if an admin points them
  // both there. eVerify uses two placements of this one, for "Verify Personal
  // Information" and "QR Verify".
  faceLivenessSessionGeneratorRequests?: string[];
  // The caller's gateway base URL (credential.public.base_url), which the
  // spec deliberately doesn't carry — see lib/base-url.ts. Fills the
  // collection's blank base-URL variable so the tester sends to a real host.
  baseUrl?: string | null;
  // Shown in place of the base URL when the collection declares a blank one
  // and no `baseUrl` was supplied — e.g. "generate a credential to get your
  // base URL". Passed in rather than hardcoded because the right call to
  // action differs by page (sign in, vs. open the Credentials tab).
  baseUrlNotice?: React.ReactNode;
  // Read-the-docs mode: sidebar navigation and request documentation only —
  // no Test tab, no collection variables, no extension widgets. That's the
  // whole of what the public catalog page offers, and it isn't only a
  // presentation choice: every one of those features calls a server action
  // behind requireClientSession(), which redirects to login. The eGovPH SSO
  // extension does it on mount, so an anonymous visitor was bounced off the
  // page before it finished rendering.
  interactive?: boolean;
}) {
  const tree = useMemo(() => buildTree(collection.item), [collection]);
  const options = useMemo(() => variableOptions(collection), [collection]);
  const [selectedId, setSelectedId] = useState(() => firstRequest(tree)?.id ?? "");
  // Lifted here (not inside the tester) so a value produced by one request —
  // e.g. an access token — carries over when the user switches to the next.
  // Values persist per collection in this browser's localStorage only.
  const defaults = useMemo(() => {
    const base = initialVariables(options);
    // Only seed the default when this collection actually declares
    // partner_code as one of its own variables (i.e. this is the eGov SSO
    // collection used by the exchange-code-generator extension) — collections
    // that never declared it at all must not gain it. `options` (built
    // straight from the collection's own `variable` array) still has the key
    // for a declared-but-empty variable, unlike `base`, so `in` is the right
    // check here, not `!base.partner_code` alone.
    if ("partner_code" in options && !base.partner_code) {
      base.partner_code = env.NEXT_PUBLIC_EGOV_SSO_PARTNER_CODE;
    }
    return base;
  }, [options]);
  const collectionId = collection.info._postman_id ?? collection.info.name;
  const storageKey = `egov-api-docs:variables:${collectionId}`;
  const { variables: storedVariables, setVariable, removeVariable } = usePersistentVariables(
    storageKey,
    defaults,
  );
  // Blank base-URL variables are filled from the credential when there is
  // one; when there isn't, they stay blank and baseUrlNotice explains why.
  const baseUrlKeys = useMemo(() => blankBaseUrlKeys(collection), [collection]);
  const variables = useMemo(
    () => withBaseUrl(storedVariables, baseUrlKeys, baseUrl),
    [storedVariables, baseUrlKeys, baseUrl],
  );
  const showBaseUrlNotice = baseUrlNotice != null && baseUrlKeys.length > 0 && !baseUrl;

  // Every {{token}} referenced anywhere in the collection — so a successful
  // response from one request can capture a value into a variable that only
  // a *different* request uses (e.g. request 1 returns access_token, which
  // fills the {{accessToken}} that request 2's bearer auth references).
  const knownVariableKeys = useMemo(() => {
    const texts: string[] = [];
    const visit = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.kind === "folder") {
          visit(node.children);
          continue;
        }
        const request = normalizeRequest(node.item.request);
        const authHeader = getAuthHeader(request.auth);
        texts.push(
          request.urlRaw,
          request.bodyRaw,
          ...request.headers.map((header) => `${header.key} ${header.value}`),
          authHeader ? `${authHeader.key} ${authHeader.value}` : "",
        );
      }
    };
    visit(tree);
    return Array.from(new Set([...Object.keys(defaults), ...collectVariableTokens(...texts)]));
  }, [tree, defaults]);

  const selected = findRequest(tree, selectedId);
  const description = getDescriptionText(collection.info.description);
  const [variablesOpen, setVariablesOpen] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
        <div className="rounded-xl border border-border p-2">
          <SidebarTree nodes={tree} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </aside>

      {interactive && (
        <VariablesManager
          open={variablesOpen}
          onOpenChange={setVariablesOpen}
          variables={variables}
          variableOptions={options}
          knownVariableKeys={knownVariableKeys}
          baseUrlKeys={baseUrlKeys}
          baseUrlHint={showBaseUrlNotice ? "Comes with your credential" : undefined}
          onVariableChange={setVariable}
          onVariableRemove={removeVariable}
        />
      )}

      <div className="min-w-0 space-y-4">
        {showBaseUrlNotice && (
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3">
            <KeyRound aria-hidden className="mt-px size-4 shrink-0 text-muted-foreground" />
            <div className="text-sm leading-relaxed text-muted-foreground">{baseUrlNotice}</div>
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {description && <Markdown className="max-w-[75ch]">{description}</Markdown>}
          </div>
          {interactive && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setVariablesOpen(true)}
            >
              <Braces aria-hidden className="size-3.5" />
              Variables
            </Button>
          )}
        </div>

        {!selected ? (
          <EmptyState
            title="No requests in this collection"
            description="This collection has no documented requests to display."
          />
        ) : (
          <div className="space-y-4">
            {interactive && exchangeCodeGeneratorRequests.includes(selected.name) && (
              <ExchangeCodeGenerator
                // The minted code is all it produces — the panel has no partner
                // input any more, so there is nothing else that could write to
                // the collection's variables.
                onGenerated={(code) => setVariable("exchange_code", code)}
              />
            )}
            {interactive && faceLivenessSessionGeneratorRequests.includes(selected.name) && (
              <FaceLivenessSessionGenerator
                variables={variables}
                onGenerated={(sessionId) => setVariable("face_liveness_session_id", sessionId)}
                onManageVariables={() => setVariablesOpen(true)}
              />
            )}
            <h2 className="text-xl font-semibold tracking-tight">{selected.name}</h2>
            {/* One tab is not a tablist — read-the-docs mode renders the
                documentation directly rather than a Tabs with nothing to
                switch to. */}
            {!interactive ? (
              <RequestDoc item={selected.item} />
            ) : (
              <Tabs defaultValue="docs">
                <TabsList>
                  <TabsTrigger value="docs" className="gap-1.5 px-3">
                    <BookOpen aria-hidden className="size-3.5" />
                    Documentation
                  </TabsTrigger>
                  <TabsTrigger value="test" className="gap-1.5 px-3">
                    <FlaskConical aria-hidden className="size-3.5" />
                    Test
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="docs" className="pt-2" keepMounted>
                  <RequestDoc item={selected.item} />
                </TabsContent>
                <TabsContent value="test" className="pt-2" keepMounted>
                  <TryItPanel
                    key={selected.id}
                    item={selected.item}
                    variables={variables}
                    knownVariableKeys={knownVariableKeys}
                    storagePrefix={`egov-api-docs:${collectionId}:${selected.id}`}
                    onVariableChange={setVariable}
                    onManageVariables={() => setVariablesOpen(true)}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
