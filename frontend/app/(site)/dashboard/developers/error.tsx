"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { reportError } from "@/lib/report-error";

export default function MyProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error.message, error.digest, "dashboard/developers/error");
  }, [error]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
        {env.NODE_ENV === "development"
          ? error.message
          : "An unexpected error occurred while loading your developer access. Please try again."}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
      )}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
