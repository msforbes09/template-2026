"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Couldn't load broadcasts"
      description="Something went wrong on our side. Try again in a moment."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
