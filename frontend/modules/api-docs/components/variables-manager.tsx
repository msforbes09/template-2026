"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResourceModal } from "@/components/ui/resource-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Collection-level variable management — variables are shared by every
// request, so they're edited here (one modal for the whole collection)
// rather than inside any single request's tester.
export function VariablesManager({
  open,
  onOpenChange,
  variables,
  variableOptions,
  knownVariableKeys,
  baseUrlKeys = [],
  baseUrlHint,
  onVariableChange,
  onVariableRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variables: Record<string, string>;
  // Keys the collection defines more than once (e.g. baseUrl for staging vs
  // local) map to every defined value; those render as a select, not an input.
  variableOptions: Record<string, string[]>;
  knownVariableKeys: string[];
  // Base-URL variables the spec deliberately left blank (see lib/base-url.ts).
  // When they're still unfilled, `baseUrlHint` replaces the generic "value"
  // placeholder so the empty box reads as "waiting on your credential"
  // rather than "the admin forgot to fill this in".
  baseUrlKeys?: string[];
  baseUrlHint?: string;
  onVariableChange: (key: string, value: string) => void;
  onVariableRemove: (key: string) => void;
}) {
  const [draftKey, setDraftKey] = useState("");
  const [draftValue, setDraftValue] = useState("");

  const keys = Array.from(new Set([...knownVariableKeys, ...Object.keys(variables)]));

  // Only user-added variables can be removed — collection-defined keys and
  // {{tokens}} referenced by requests would just reappear.
  function isRemovable(key: string) {
    return !(key in variableOptions) && !knownVariableKeys.includes(key);
  }

  function addVariable() {
    const key = draftKey.trim().replace(/^\{\{|\}\}$/g, "");
    if (!key) return;
    onVariableChange(key, draftValue);
    setDraftKey("");
    setDraftValue("");
  }

  return (
    <ResourceModal
      open={open}
      onOpenChange={onOpenChange}
      title="Collection variables"
      description="Shared by every request in this collection and saved only in this browser. Values are substituted into {{placeholders}} on send."
    >
      <div className="space-y-4">
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No variables yet — add one below.</p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {keys.map((key) => {
              const options = variableOptions[key] ?? [];
              return (
                <div key={key} className="flex items-center gap-2">
                  <label
                    htmlFor={`manage-var-${key}`}
                    className="w-32 shrink-0 truncate font-mono text-xs font-medium text-primary"
                    title={`{{${key}}}`}
                  >
                    {`{{${key}}}`}
                  </label>
                  {options.length > 1 ? (
                    <Select
                      value={variables[key] ?? options[0]}
                      onValueChange={(value) => onVariableChange(key, String(value ?? ""))}
                    >
                      <SelectTrigger
                        id={`manage-var-${key}`}
                        aria-label={`Value for ${key}`}
                        className="h-8 w-full flex-1 font-mono text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option} value={option} className="font-mono text-xs">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`manage-var-${key}`}
                      value={variables[key] ?? ""}
                      onChange={(event) => onVariableChange(key, event.target.value)}
                      placeholder={
                        baseUrlHint && baseUrlKeys.includes(key) && !variables[key]
                          ? baseUrlHint
                          : "value"
                      }
                      className="h-8 font-mono text-xs"
                    />
                  )}
                  {isRemovable(key) && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove variable ${key}`}
                      onClick={() => onVariableRemove(key)}
                    >
                      <Trash2 aria-hidden className="size-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-border pt-4">
          <Input
            aria-label="New variable key"
            value={draftKey}
            placeholder="Variable key"
            onChange={(event) => setDraftKey(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addVariable()}
            className="h-8 w-36 font-mono text-xs"
          />
          <Input
            aria-label="New variable value"
            value={draftValue}
            placeholder="Value"
            onChange={(event) => setDraftValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addVariable()}
            className="h-8 flex-1 font-mono text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={!draftKey.trim()}
            onClick={addVariable}
          >
            <Plus aria-hidden className="size-3" />
            Add
          </Button>
        </div>
      </div>
    </ResourceModal>
  );
}
