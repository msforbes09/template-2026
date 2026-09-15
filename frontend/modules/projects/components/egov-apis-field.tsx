"use client";

import { useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PublicApiCatalogItem } from "@/types/public-api-catalog";

// `egov_apis_used` must be active API-catalog *identifiers* — the API
// validates them (422 on `egov_apis_used.N`), so this picks from the live
// catalogue (GET common/api-catalogs, fetched by the page and passed in)
// rather than letting anyone type an identifier by hand.
//
// A checkbox list rather than a multi-combobox: the catalogue is a dozen or
// so entries, all of which a developer wants to see at once.
export function EgovApisField({
  id,
  catalogs,
  value,
  onChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  catalogs: PublicApiCatalogItem[];
  value: string[];
  onChange: (next: string[]) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const groupId = useId();
  // Ephemeral widget filter — not a page-level filter, so it stays in
  // useState rather than the URL.
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return catalogs;
    return catalogs.filter(
      (catalog) =>
        catalog.identifier.toLowerCase().includes(needle) ||
        (catalog.name ?? "").toLowerCase().includes(needle),
    );
  }, [catalogs, query]);

  // An identifier the project stores that's no longer in the catalogue (the
  // API deactivated it after publication) would otherwise vanish from the
  // form and be silently dropped on the next save.
  const orphaned = value.filter(
    (identifier) => !catalogs.some((catalog) => catalog.identifier === identifier),
  );

  function toggle(identifier: string, checked: boolean) {
    onChange(checked ? [...value, identifier] : value.filter((item) => item !== identifier));
  }

  if (catalogs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        The API catalogue is unavailable right now, so the list of eGov APIs can&apos;t be shown.
        Try again in a moment.
      </p>
    );
  }

  return (
    <div className="space-y-2" id={id}>
      {catalogs.length > 6 && (
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter APIs…"
            aria-label="Filter the list of eGov APIs"
            className="pl-9"
          />
        </div>
      )}
      {/* `aria-invalid` isn't valid on role="group", so an invalid selection
          is signalled by the border plus AppFormField's own error text (which
          this group points at via aria-describedby). */}
      <div
        role="group"
        aria-label="eGov APIs used"
        aria-describedby={ariaDescribedBy}
        className={cn(
          "max-h-72 space-y-0.5 overflow-y-auto rounded-lg border p-2",
          ariaInvalid ? "border-destructive" : "border-border",
        )}
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No API matches &ldquo;{query}&rdquo;.
          </p>
        ) : (
          filtered.map((catalog) => {
            const checkboxId = `${groupId}-${catalog.identifier}`;
            const checked = value.includes(catalog.identifier);
            return (
              <label
                key={catalog.identifier}
                htmlFor={checkboxId}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50"
              >
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  onCheckedChange={(next) => toggle(catalog.identifier, next === true)}
                />
                {/* Name only. The identifier used to sit under every row, which
                    doubled the row height and pushed the list into a scroll for
                    the sake of a slug nobody picks an API by. Filtering still
                    matches it, and an orphaned one is still shown below as a
                    chip, since there it is the only name there is. */}
                <span className="min-w-0 truncate text-sm font-medium">
                  {catalog.name ?? catalog.identifier}
                </span>
              </label>
            );
          })
        )}
      </div>
      {orphaned.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Also selected, but no longer in the catalogue. They stay on the project until you
            remove them.
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {orphaned.map((identifier) => (
              <li key={identifier}>
                <Badge variant="secondary" className="gap-1 py-1 pl-2.5 pr-1 font-mono text-xs">
                  {identifier}
                  <button
                    type="button"
                    aria-label={`Remove ${identifier}`}
                    onClick={() => toggle(identifier, false)}
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {value.length} selected
      </p>
    </div>
  );
}
