"use client";

import { useMemo } from "react";
import { Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function isParseable(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

// Plain-text JSON editing with a prettify button. Validation (must be a JSON
// object) lives in the zod schema so the error renders through AppFormField
// like every other field.
export function JsonEditor({
  id,
  value,
  onChange,
  placeholder,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  value: string;
  onChange: (json: string) => void;
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const canFormat = useMemo(() => value.trim() !== "" && isParseable(value), [value]);

  return (
    <div className="space-y-1.5">
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? '{ "format": "openapi" }'}
        spellCheck={false}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className="min-h-32 font-mono text-xs leading-relaxed"
      />
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="gap-1"
        disabled={!canFormat}
        onClick={() => onChange(JSON.stringify(JSON.parse(value), null, 2))}
      >
        <Braces aria-hidden className="size-3" />
        Format JSON
      </Button>
    </div>
  );
}
