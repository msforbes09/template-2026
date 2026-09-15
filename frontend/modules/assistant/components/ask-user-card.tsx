"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A question with clickable answers, for the moments the assistant needs a
// decision — "Do you want to proceed?", "Which environment?" — instead of
// asking in prose and waiting for the user to type "yes".
//
// Deliberately generic rather than a yes/no widget: the same shape covers a
// two-way confirm and a short list of named choices, and one card is easier to
// keep consistent than several.
//
// NOT a substitute for the action cards. Generating a credential, revoking one
// and running a test each carry their own confirmation with the specific
// consequence spelled out on it ("spends one usage credit", "breaks any
// integration using it"). A generic "Proceed?" in front of those would be a
// second, vaguer gate that teaches people to click through.

export type AskUserResult = { choice: string };

// Destructive-sounding answers get a quieter treatment than the affirmative
// one, so "Yes" and "Cancel" don't look equally weighted.
function isDismissive(option: string): boolean {
  return /^(no|cancel|not now|never mind|skip|back)\b/i.test(option.trim());
}

export function AskUserCard({
  question,
  options,
  onResult,
}: {
  question: string;
  options: string[];
  onResult: (result: AskUserResult) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="text-xs leading-relaxed text-foreground">{question}</p>

      {chosen ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check aria-hidden className="size-3.5" />
          {chosen}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={isDismissive(option) ? "ghost" : "outline"}
              className={cn("h-auto py-1.5 text-xs font-normal")}
              onClick={() => {
                setChosen(option);
                onResult({ choice: option });
              }}
            >
              {option}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
