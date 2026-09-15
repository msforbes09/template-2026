"use client";

import { KeyRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/modules/api-docs/components/code-block";
import { KvTable } from "@/modules/api-docs/components/kv-table";
import { Markdown } from "@/components/ui/markdown";
import { MethodBadge } from "@/modules/api-docs/components/method-badge";
import { StatusPill } from "@/modules/api-docs/components/status-pill";
import {
  authLabel,
  buildCurl,
  getAuthHeader,
  getDescriptionText,
  normalizeRequest,
  prettyJson,
  splitVariableTokens,
} from "@/modules/api-docs/lib/postman";
import type { PostmanHeader, PostmanItem, PostmanResponse } from "@/modules/api-docs/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function UrlBar({ method, url }: { method: string; url: string }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-border bg-muted/40 px-3 py-2">
      <MethodBadge method={method} />
      <code className="font-mono text-sm whitespace-nowrap">
        {splitVariableTokens(url).map((part, i) =>
          part.isVariable ? (
            <span key={i} className="font-semibold text-primary">
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
      </code>
    </div>
  );
}

function responseHeaders(response: PostmanResponse): { key: string; value: string }[] {
  if (!Array.isArray(response.header)) return [];
  return response.header
    .filter((header): header is PostmanHeader => typeof header !== "string")
    .map((header) => ({ key: header.key, value: String(header.value) }));
}

function ExampleResponses({ responses }: { responses: PostmanResponse[] }) {
  return (
    <Tabs defaultValue="0">
      <TabsList className="max-w-full overflow-x-auto">
        {responses.map((response, i) => (
          <TabsTrigger key={i} value={String(i)} className="gap-2 px-2">
            <StatusPill code={response.code} />
            <span className="max-w-48 truncate">{response.name ?? `Example ${i + 1}`}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {responses.map((response, i) => {
        const headers = responseHeaders(response);
        return (
          <TabsContent key={i} value={String(i)} className="space-y-3 pt-2">
            <CodeBlock
              label={`Response body · ${response.code ?? ""} ${response.status ?? ""}`.trim()}
              code={prettyJson(response.body) || "(empty body)"}
            />
            {headers.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none hover:text-foreground">
                  Response headers ({headers.length})
                </summary>
                <div className="pt-2">
                  <KvTable ariaLabel="Response headers" rows={headers} />
                </div>
              </details>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

export function RequestDoc({ item }: { item: PostmanItem }) {
  const request = normalizeRequest(item.request);
  const description = getDescriptionText(item.description) || request.description;
  const auth = authLabel(request.auth);
  const authHeader = getAuthHeader(request.auth);
  const docHeaders = [
    ...(authHeader ? [authHeader] : []),
    ...request.headers,
  ];

  const curl = buildCurl({
    method: request.method,
    url: request.urlRaw,
    headers: docHeaders,
    bodyRaw: request.bodyRaw,
    bodyMode: request.bodyMode,
  });

  return (
    <div className="space-y-6">
      <UrlBar method={request.method} url={request.urlRaw} />

      {description && <Markdown className="max-w-[75ch]">{description}</Markdown>}

      {auth && (
        <Section title="Authorization">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <KeyRound aria-hidden className="size-3" />
              {auth}
            </span>
            {authHeader && (
              <code className="font-mono text-xs text-muted-foreground">
                {authHeader.key}:{" "}
                {splitVariableTokens(authHeader.value).map((part, i) =>
                  part.isVariable ? (
                    <span key={i} className="font-semibold text-primary">
                      {part.text}
                    </span>
                  ) : (
                    <span key={i}>{part.text}</span>
                  ),
                )}
              </code>
            )}
          </div>
        </Section>
      )}

      {request.headers.length > 0 && (
        <Section title="Headers">
          <KvTable
            ariaLabel="Request headers"
            rows={request.headers.map((header) => ({
              key: header.key,
              value: header.value,
              description: header.description,
            }))}
          />
        </Section>
      )}

      {request.pathVariables.length > 0 && (
        <Section title="Path variables">
          <KvTable
            ariaLabel="Path variables"
            rows={request.pathVariables.map((variable) => ({
              key: variable.key ?? variable.id ?? "",
              value: variable.value == null ? "" : String(variable.value),
              description: getDescriptionText(variable.description) || undefined,
            }))}
          />
        </Section>
      )}

      {request.queryParams.length > 0 && (
        <Section title="Query parameters">
          <KvTable
            ariaLabel="Query parameters"
            rows={request.queryParams.map((param) => ({
              key: param.key ?? "",
              value: param.value ?? "",
              description: getDescriptionText(param.description) || undefined,
            }))}
          />
        </Section>
      )}

      {request.bodyRaw && (
        <Section title={`Body${request.bodyMode ? ` · ${request.bodyMode}` : ""}`}>
          <CodeBlock label="Request body" code={prettyJson(request.bodyRaw)} highlightVariables />
        </Section>
      )}

      <Section title="Example request">
        <CodeBlock label="cURL" code={curl} highlightVariables />
      </Section>

      {(item.response?.length ?? 0) > 0 && (
        <Section title="Example responses">
          <ExampleResponses responses={item.response ?? []} />
        </Section>
      )}
    </div>
  );
}
