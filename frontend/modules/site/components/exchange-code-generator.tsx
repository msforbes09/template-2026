"use client";

import { useEffect, useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodeBlock } from "@/modules/api-docs/components/code-block";
import {
  generateExchangeCode,
  listTestAccounts,
} from "@/modules/site/actions/exchange-code-actions";
import type { EgovTestAccount } from "@/types/client-user";

// Catalogs opt into this widget via EXCHANGE_CODE_GENERATOR_EXTENSION in
// their `meta.extensions` array — see lib/catalog-meta.ts.

export function ExchangeCodeGenerator({
  onGenerated,
}: {
  // Called with the minted code — lets a parent (CollectionViewer) seed it
  // into the collection's {{exchange_code}} variable.
  onGenerated?: (code: string) => void;
}) {
  const [accounts, setAccounts] = useState<EgovTestAccount[] | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [loadingAccounts, startLoadingAccounts] = useTransition();
  const [email, setEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exchangeCode, setExchangeCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // This widget is only ever mounted once its parent has already decided to
  // show it (CollectionViewer renders it conditionally), so loading on mount
  // is the equivalent of ViewSpecModal's load-on-open — there's no separate
  // "opened" moment to hook.
  useEffect(() => {
    startLoadingAccounts(async () => {
      const result = await listTestAccounts();
      if (!result.ok) {
        setAccountsError(result.message);
        return;
      }
      setAccounts(result.data);
      // No default pick — the tester chooses a persona deliberately; Generate
      // stays disabled until they do.
    });
  }, []);

  async function generate() {
    if (!email) return;
    setGenerating(true);
    setError(null);
    const result = await generateExchangeCode(email);
    setGenerating(false);

    if (!result.ok) {
      setExchangeCode(null);
      setError(result.message);
      return;
    }
    setExchangeCode(result.data.exchangeCode);
    onGenerated?.(result.data.exchangeCode);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound aria-hidden className="size-4" />
          Generate an eGov exchange code
        </CardTitle>
        <CardDescription>
          Mint an exchange code against this platform&apos;s own eGov partner using a test
          identity — the same thing a real SSO redirect would hand you. Use it against the
          eGov-SSO gateway.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="exchange-code-test-account" className="text-sm font-medium">
            Test account
          </label>
          <Select
            value={email}
            onValueChange={(value) => setEmail(String(value ?? ""))}
            disabled={loadingAccounts || !accounts?.length}
            // Lets the closed trigger show the selected account's *name*;
            // without this Base UI renders the raw value (the email).
            items={accounts?.map((account) => ({ value: account.email, label: account.name }))}
          >
            <SelectTrigger id="exchange-code-test-account" className="w-full">
              <SelectValue
                placeholder={loadingAccounts ? "Loading test accounts…" : "Select a test account"}
              />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((account) => (
                <SelectItem key={account.email} value={account.email}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {accountsError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {accountsError}
            </p>
          )}
        </div>
        <Button
          type="button"
          className="gap-2"
          disabled={generating || !email}
          onClick={() => void generate()}
        >
          {generating && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Generate
        </Button>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}
        {exchangeCode && <CodeBlock label="Exchange code" code={exchangeCode} />}
      </CardContent>
    </Card>
  );
}
