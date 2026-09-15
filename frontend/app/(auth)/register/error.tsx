"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { env } from "@/lib/env";
import { reportError } from "@/lib/report-error";

export default function RegisterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error.message, error.digest, "auth/register/error");
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
          {env.NODE_ENV === "development"
            ? error.message
            : "An unexpected error occurred while loading this page. Please try again."}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft aria-hidden className="size-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
