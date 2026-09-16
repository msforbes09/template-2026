"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// A small ⓘ beside a label, explaining what the figure it labels means.
//
// A real BUTTON, not a title attribute: the tooltip opens on hover AND on
// keyboard focus, and the aria-label carries the text for screen readers —
// a title tooltip does neither. The trigger stays icon-sized so it reads as
// an aside, never as part of the label.
export function InfoHint({ text, className }: { text: string; className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          aria-label={text}
          className={cn(
            "inline-flex shrink-0 items-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            className,
          )}
        >
          <Info aria-hidden className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[16rem] text-left normal-case tracking-normal">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
