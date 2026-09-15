"use client";

import { useState } from "react";
import Script from "next/script";
import { Loader2, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CodeBlock } from "@/modules/api-docs/components/code-block";
import { VariablesStrip } from "@/modules/api-docs/components/variables-strip";
import { collectVariableTokens, substituteVariables } from "@/modules/api-docs/lib/postman";

// The eVerify Face Liveness Web SDK (loaded via next/script below) attaches
// eKYC() to window itself — it ships no npm package/types, so declare just
// enough of its shape to type-check the one call site below. Optional
// because it's undefined until the script has loaded (see sdkReady state).
// Same inline-in-the-sole-consumer pattern as lib/echo-client.ts's
// `declare global { interface Window { Pusher: ... } }`.
declare global {
  interface Window {
    eKYC?: () => {
      start: (options: { pubKey: string }) => Promise<EverifyLivenessResult>;
    };
  }
}

type EverifyLivenessResult = {
  status: string; // only "COMPLETED" is documented; treat anything else as failure
  result: {
    photo: string; // data:image/jpeg;base64,...
    session_id: string;
    photo_url: string;
  };
};

const EVERIFY_LIVENESS_SDK_SRC = "https://liveness.everify.gov.ph/js/everify-liveness-sdk.min.js";

// Catalogs opt into this widget via FACE_LIVENESS_SESSION_GENERATOR_EXTENSION
// in their `meta.extensions` array — see lib/catalog-meta.ts.

export function FaceLivenessSessionGenerator({
  variables,
  onGenerated,
  onManageVariables,
}: {
  // The collection's live variable map (CollectionViewer's
  // usePersistentVariables) — lets the Public API Key field accept a
  // {{public_api_key}}-style reference, resolved the same way
  // ExchangeCodeGenerator's Partner code field resolves its own token.
  variables: Record<string, string>;
  // Called with the completed check's session_id — lets a parent
  // (CollectionViewer) seed it into the collection's
  // {{face_liveness_session_id}} variable.
  onGenerated?: (sessionId: string) => void;
  // Opens the collection's VariablesManager from the strip below the key
  // field — same editor the Try-it panel's "Manage variables" opens.
  onManageVariables?: () => void;
}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  // Defaults to a {{public_api_key}} reference rather than a literal value —
  // still editable to a literal key for testing, or left as-is if the
  // collection (or tester, via the Variables panel) already sets that variable.
  // Unlike the exchange-code panel, this key really is the caller's to choose:
  // that endpoint dropped its partner input, this one has not.
  const [pubKey, setPubKey] = useState("{{public_api_key}}");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    sessionId: string;
    photoUrl: string;
    photo: string;
  } | null>(null);

  async function start() {
    // Resolves a {{public_api_key}}-style reference against the live
    // variable store; a literal value has no {{...}} token to match, so it
    // passes through unchanged.
    const resolvedPubKey = substituteVariables(pubKey, variables);
    if (!sdkReady || !resolvedPubKey || !window.eKYC) return;
    setStarting(true);
    setError(null);
    try {
      const outcome = await window.eKYC().start({ pubKey: resolvedPubKey });
      if (outcome.status !== "COMPLETED") {
        setError("Liveness check did not complete.");
        return;
      }
      const { session_id, photo_url, photo } = outcome.result;
      setResult({ sessionId: session_id, photoUrl: photo_url, photo });
      onGenerated?.(session_id);
    } catch {
      // The SDK's rejection shape (thrown error vs. user cancellation) isn't
      // documented — treat both generically.
      setError("Face liveness check failed or was cancelled.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <Card>
      {/* strategy="afterInteractive" (the default): this widget only ever
          mounts once CollectionViewer has already decided to show it, so
          there's no reason to defer to lazyOnload — fetch it as soon as
          reasonably possible, same tier as ExchangeCodeGenerator's
          fetch-on-mount test-account list.
          onReady (not onLoad): onLoad fires once ever, globally; this
          component unmounts/remounts every time the tester navigates the
          sidebar away from and back to the configured request, and onReady
          fires again on each such remount — onLoad would leave sdkReady
          stuck at false after the first visit. */}
      <Script
        id="everify-liveness-sdk"
        src={EVERIFY_LIVENESS_SDK_SRC}
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
        onError={() =>
          setSdkError("Couldn't load the Face Liveness SDK. Check your connection and reload.")
        }
      />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanFace aria-hidden className="size-4" />
          Start a face liveness session
        </CardTitle>
        <CardDescription>
          Run eVerify&apos;s Face Liveness check and capture a session id to test this
          integration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Shows what the key field's {{tokens}} resolve to (or "Not set") so
            the tester sees the problem here, not only after the SDK fails. */}
        <VariablesStrip
          tokens={collectVariableTokens(pubKey)}
          variables={variables}
          onManageVariables={onManageVariables}
        />

        <div className="space-y-1.5">
          <label htmlFor="face-liveness-pub-key" className="text-sm font-medium">
            Public API key
          </label>
          <Input
            id="face-liveness-pub-key"
            value={pubKey}
            onChange={(event) => setPubKey(event.target.value)}
            placeholder="Paste this catalog's public API key"
          />
          <p className="text-xs text-muted-foreground">
            Type a real value, or reference a variable like {"{{public_api_key}}"}.
          </p>
        </div>

        {sdkError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          >
            {sdkError}
          </p>
        )}

        <Button
          type="button"
          className="gap-2"
          disabled={!sdkReady || starting || !pubKey}
          onClick={() => void start()}
        >
          {starting && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {sdkReady ? "Start liveness check" : "Loading SDK…"}
        </Button>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- base64 data: URI, next/image's optimizer doesn't support data: URIs */}
            <img
              src={result.photo}
              alt="Captured liveness selfie"
              className="h-24 w-24 rounded-lg border border-border object-cover"
            />
            <CodeBlock label="Session id" code={result.sessionId} />
            <CodeBlock label="Photo URL" code={result.photoUrl} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
