"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// A free-text list field (tech stack, team members): type a value, press
// Enter or comma to add it, click a chip's × to remove it. The API takes
// these as plain string arrays, so there's nothing to pick from — hence a
// text input rather than a combobox.
//
// Additions and removals are announced in an aria-live region: a chip
// appearing elsewhere on the page is invisible to a screen reader user who
// is still focused in the input.
export function StringListInput({
  id,
  value,
  onChange,
  placeholder,
  addLabel,
  maxItems,
  maxLength,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel: string;
  maxItems?: number;
  maxLength?: number;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const atLimit = maxItems !== undefined && value.length >= maxItems;

  function add(raw: string) {
    const entry = raw.trim();
    if (!entry || atLimit) return;
    // Case-insensitive dedupe: "Laravel" and "laravel" are the same entry to
    // a reader, and a duplicated chip looks like a bug.
    if (value.some((item) => item.toLowerCase() === entry.toLowerCase())) {
      setDraft("");
      setAnnouncement(`${entry} is already in the list`);
      return;
    }
    onChange([...value, entry]);
    setDraft("");
    setAnnouncement(`${entry} added`);
  }

  function remove(entry: string) {
    onChange(value.filter((item) => item !== entry));
    setAnnouncement(`${entry} removed`);
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id={id}
          value={draft}
          maxLength={maxLength}
          disabled={atLimit}
          placeholder={atLimit ? `Maximum of ${maxItems} reached` : placeholder}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          onChange={(event) => {
            // A pasted or typed comma commits the entry, so "Laravel, Vue"
            // lands as two chips rather than one.
            const next = event.target.value;
            if (next.includes(",")) {
              next.split(",").forEach(add);
              return;
            }
            setDraft(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              // Enter in this field means "add", never "submit the form".
              event.preventDefault();
              add(draft);
            }
            if (event.key === "Backspace" && !draft && value.length) {
              remove(value[value.length - 1]);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!draft.trim() || atLimit}
          onClick={() => add(draft)}
          className="shrink-0 gap-1.5"
        >
          <Plus aria-hidden className="size-4" />
          {addLabel}
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((entry) => (
            <li key={entry}>
              <Badge variant="secondary" className="gap-1 py-1 pl-2.5 pr-1">
                {entry}
                <button
                  type="button"
                  aria-label={`Remove ${entry}`}
                  onClick={() => remove(entry)}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
