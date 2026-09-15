"use client";

import { useState } from "react";
import { Markdown } from "@/components/ui/markdown";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// The description's half of the "What changed" section: long markdown makes
// stacked Before/After rows unreadable, so this one field gets a tab switch
// instead — defaulting to After, the version up for publishing.
export function DiffMarkdownTabs({ before, after }: { before: string; after: string }) {
  const [side, setSide] = useState<"before" | "after">("after");

  return (
    <div className="space-y-3">
      <Tabs value={side} onValueChange={(value) => setSide(value as "before" | "after")}>
        <TabsList>
          <TabsTrigger value="before" className="px-2.5">
            Before
          </TabsTrigger>
          <TabsTrigger value="after" className="px-2.5">
            After
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div
        className={
          side === "after"
            ? "rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4"
            : "rounded-lg border border-border bg-muted/40 p-4"
        }
      >
        <Markdown>{side === "after" ? after : before}</Markdown>
      </div>
    </div>
  );
}
