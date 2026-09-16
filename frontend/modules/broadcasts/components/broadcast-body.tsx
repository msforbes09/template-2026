"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// The broadcast's message in the history card — clamped, with the full text
// one click away. A sent broadcast has no edit screen to open, so without
// this there was no way for an admin to read back what actually went out.
//
// The toggle is offered by length rather than by measuring the clamp: a
// heuristic that is occasionally generous beats a layout-effect measurement
// for two lines of text.
const CLAMP_THRESHOLD = 140;

export function BroadcastBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const clampable = body.length > CLAMP_THRESHOLD || body.includes("\n");

  return (
    <div className="mt-2 max-w-[70ch]">
      <p
        className={
          expanded
            ? "whitespace-pre-wrap text-sm text-muted-foreground"
            : "line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground"
        }
      >
        {body}
      </p>
      {clampable && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-7 gap-1 px-2 text-xs text-muted-foreground"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? (
            <>
              Show less
              <ChevronUp aria-hidden className="size-3.5" />
            </>
          ) : (
            <>
              View full message
              <ChevronDown aria-hidden className="size-3.5" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
