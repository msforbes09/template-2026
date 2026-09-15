"use client";

import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SignInPrompt } from "@/modules/assistant/lib/tool-output";

// The rendered result of promptSignIn: the actual way into an account, rather
// than the model describing one in prose.
//
// Email/password is the only way in — eGovPH SSO sign-in was removed — so
// this always points at /login and /register.

export function SignInCard({ reason }: SignInPrompt) {

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <LogIn aria-hidden className="size-3.5 shrink-0" />
        {reason ? `Sign in to ${reason}` : "Sign in to continue"}
      </p>

      {/* Signing in navigates away, and the conversation is in memory only,
          so it doesn't survive. Nothing to do about that here — the login form
          always lands on /dashboard. */}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" className="h-8 text-xs" nativeButton={false} render={<Link href="/login" />}>
          <LogIn aria-hidden data-icon="inline-start" />
          Log in
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          nativeButton={false}
          render={<Link href="/register" />}
        >
          <UserPlus aria-hidden data-icon="inline-start" />
          Create an account
        </Button>
      </div>
    </div>
  );
}
