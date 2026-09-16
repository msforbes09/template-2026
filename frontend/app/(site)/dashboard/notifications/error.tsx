"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load your notifications"
        description="Something went wrong on our side. Try again in a moment."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
