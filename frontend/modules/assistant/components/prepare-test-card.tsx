"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { asPostmanCollection } from "@/modules/api-docs/lib/postman";
import {
  readCollectionVariables,
  withCredentialExtras,
  writeCollectionVariables,
} from "@/modules/assistant/lib/collection-variables";
import { FaceLivenessSessionGenerator } from "@/modules/site/components/face-liveness-session-generator";
import {
  generateExchangeCode,
  listTestAccounts,
} from "@/modules/site/actions/exchange-code-actions";
import type { EgovTestAccount } from "@/types/client-user";
import type { PostmanCollection } from "@/modules/api-docs/types";

// Satisfies a catalog's testing prerequisite from inside the chat.
//
// Two shapes, and the difference is not cosmetic:
//
// - exchange-code (eGov SSO): fully automatable. Mints a code for a test
//   account through the same server action the docs page uses, then writes
//   {{exchange_code}} into the SHARED collection variable store — without that
//   write the follow-up test request still resolves to an unfilled placeholder
//   and fails. Only that one variable — nothing else here writes to the store.
//   The panel takes no partner: the code is always minted against this
//   platform's own eGov partner, server-side (2026-08-17 handoff).
// - face-liveness (eVerify): runs the same FaceLivenessSessionGenerator widget
//   the docs page mounts, right here. It drives the eKYC SDK against the
//   user's camera, which needs their participation but not a different page —
//   an earlier version deep-linked them away, which was an unnecessary
//   detour: the widget is a client component and works wherever it's mounted.
//   Its session id is written to {{face_liveness_session_id}}, same variable
//   CollectionViewer seeds.

export type PrepareTestResult = {
  ok: boolean;
  identifier: string;
  kind: "exchange-code" | "face-liveness" | "none";
  // What the model should tell the user to do next.
  variablesSet?: string[];
  needsUserAction?: boolean;
  error?: string;
};

type Prereq =
  | { kind: "exchange-code"; collection: PostmanCollection }
  | { kind: "face-liveness"; collection: PostmanCollection; extras: Record<string, string> }
  | { kind: "none" };

export function PrepareTestCard({
  identifier,
  onResult,
}: {
  identifier: string;
  onResult: (result: PrepareTestResult) => void;
}) {
  const [prereq, setPrereq] = useState<Prereq | null>(null);
  const [accounts, setAccounts] = useState<EgovTestAccount[]>([]);
  const [email, setEmail] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<string | null>(null);

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
                ? "Sign in to prepare a test for this API."
                : "Couldn't load this API.",
            );
          }
          return;
        }
        const data: {
          spec: Record<string, unknown>;
          publicExtras?: Record<string, string>;
          prerequisite?: { kind?: string } | null;
        } = await res.json();

        // The route reports the catalog's declared prerequisite; the spec is
        // needed alongside it so the exchange-code branch knows which
        // collection's variable store to write into.
        const kind = data.prerequisite?.kind;
        if (kind !== "face-liveness" && kind !== "exchange-code") {
          if (!cancelled) setPrereq({ kind: "none" });
          return;
        }

        const collection = asPostmanCollection(data.spec);
        if (!collection) {
          if (!cancelled) setLoadError("This API's spec can't be prepared from here.");
          return;
        }

        if (kind === "face-liveness") {
          if (!cancelled) {
            setPrereq({ kind: "face-liveness", collection, extras: data.publicExtras ?? {} });
          }
          return;
        }

        if (!cancelled) setPrereq({ kind: "exchange-code", collection });

        const result = await listTestAccounts();
        if (!cancelled && result.ok) {
          setAccounts(result.data);
          setEmail((current) => current || (result.data[0]?.email ?? ""));
        }
      } catch {
        if (!cancelled) setLoadError("Couldn't prepare this test.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identifier]);

  async function generate() {
    if (prereq?.kind !== "exchange-code" || !email) return;
    setRunning(true);
    try {
      const result = await generateExchangeCode(email);
      if (!result.ok) {
        setDone("error");
        setLoadError(result.message);
        onResult({ ok: false, identifier, kind: "exchange-code", error: result.message });
        return;
      }

      // Only the minted code — the one variable the follow-up request needs.
      writeCollectionVariables(prereq.collection, {
        exchange_code: result.data.exchangeCode,
      });

      setDone("ok");
      // The code itself is not returned to the model — it's short-lived test
      // credential material and the model has no use for the value, only for
      // knowing the variable is now set.
      onResult({
        ok: true,
        identifier,
        kind: "exchange-code",
        variablesSet: ["exchange_code"],
      });
    } catch {
      const message = "Couldn't generate an exchange code.";
      setDone("error");
      setLoadError(message);
      onResult({ ok: false, identifier, kind: "exchange-code", error: message });
    } finally {
      setRunning(false);
    }
  }

  if (loadError && done !== "ok") {
    return (
      <p className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
        {loadError}
      </p>
    );
  }

  if (!prereq) {
    return (
      <p aria-live="polite" className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Checking what this API needs…
      </p>
    );
  }

  if (prereq.kind === "none") {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        This API doesn&apos;t need anything prepared — you can test it directly.
      </p>
    );
  }

  if (prereq.kind === "face-liveness") {
    // The same widget the docs page mounts. It loads the eKYC SDK itself and
    // drives the camera; all this card supplies is the variable map (so a
    // blank {{public_api_key}} fills from the credential) and somewhere to put
    // the session id.
    const variables = withCredentialExtras(
      readCollectionVariables(prereq.collection),
      prereq.extras,
    );
    return (
      <div className="flex flex-col gap-2">
        {done === "ok" ? (
          <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            Liveness session captured and filled in. You can run the test now.
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            This API needs a face-liveness session. Run the check below — it
            uses your camera and stays in this window.
          </p>
        )}
        <FaceLivenessSessionGenerator
          variables={variables}
          onGenerated={(sessionId) => {
            writeCollectionVariables(prereq.collection, {
              face_liveness_session_id: sessionId,
            });
            setDone("ok");
            // The session id itself isn't reported — the model only needs to
            // know the variable is set, same rule as the exchange code.
            onResult({
              ok: true,
              identifier,
              kind: "face-liveness",
              variablesSet: ["face_liveness_session_id"],
            });
          }}
        />
      </div>
    );
  }

  if (done === "ok") {
    return (
      <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
        Exchange code generated and filled in. You can run the test now.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
        <KeyRound aria-hidden className="mt-px size-3.5 shrink-0" />
        This API needs a fresh eGov exchange code. Pick a test account and
        I&apos;ll mint one and fill it into the test variables.
      </p>
      {/* Base UI's onValueChange hands back string | null (null on clear);
          this Select can't be cleared, so the value is coalesced rather than
          widening the state type. */}
      {accounts.length > 0 && (
        <Select value={email} onValueChange={(value) => setEmail(value ?? "")}>
          <SelectTrigger aria-label="Test account" className="w-full">
            <SelectValue placeholder="Test account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.email} value={account.email}>
                {account.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-1.5"
          disabled={running || !email}
          onClick={generate}
        >
          {running ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <KeyRound aria-hidden className="size-3.5" />
          )}
          Generate code
        </Button>
      </div>
    </div>
  );
}
