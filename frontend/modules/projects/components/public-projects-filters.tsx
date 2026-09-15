"use client";

import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";
import { SearchFilterInput } from "@/components/ui/search-filter-input";
import type { PublicApiCatalogItem } from "@/types/public-api-catalog";

// value -> label, so the trigger shows "Newest first" rather than "newest".
const SORT_LABELS: Record<string, string> = {
  newest: "Newest first",
  rating: "Top rated",
};

// The public list's filters, all URL-backed so a filtered view is shareable
// and the back button behaves. `tech` and `egov_api` are comma-separated on
// the API and every value must match, which is why they render as removable
// chips — an AND filter that hides what it's applying is how people conclude
// the showcase is empty.
export function PublicProjectsFilters({ catalogs }: { catalogs: PublicApiCatalogItem[] }) {
  const params = useSearchParams();
  const update = useUpdateSearchParams();

  const search = params.get("search") ?? "";
  const sort = params.get("sort") ?? "";
  const apis = splitFilter(params.get("egov_api"));
  const techs = splitFilter(params.get("tech"));

  function setFilter(key: "egov_api" | "tech", values: string[]) {
    update({ [key]: values.length ? values.join(",") : null }, { resetPage: true });
  }

  const hasFilters = !!search || apis.length > 0 || techs.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Controlled from the URL, so "Clear all" below actually empties it.
            As an uncontrolled defaultValue it kept the typed term after the
            filters were cleared, leaving a search box that looked active over
            an unfiltered list. */}
        <SearchFilterInput
          param="search"
          label="Search projects by name or tagline"
          placeholder="Search projects…"
          className="sm:max-w-sm"
        />
        <Select
          // A one-shot picker: choosing a value appends it to the chip list
          // below, so the trigger itself never holds a selection.
          value=""
          onValueChange={(value) => {
            if (value && !apis.includes(value)) setFilter("egov_api", [...apis, value]);
          }}
        >
          <SelectTrigger aria-label="Filter by eGov API" className="sm:w-52">
            <SelectValue placeholder="eGov API" />
          </SelectTrigger>
          <SelectContent>
            {catalogs.map((catalog) => (
              <SelectItem key={catalog.identifier} value={catalog.identifier}>
                {catalog.name ?? catalog.identifier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort || "newest"}
          // `items` is what makes the trigger show the LABEL of the selected
          // option. Without it Base UI's Select.Value renders the raw value,
          // so this read "newest" instead of "Newest first".
          items={SORT_LABELS}
          onValueChange={(value) =>
            update({ sort: value === "newest" ? null : value }, { resetPage: true })
          }
        >
          <SelectTrigger aria-label="Sort projects" className="sm:w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{SORT_LABELS.newest}</SelectItem>
            {/* Ranked server-side by a weighted score, so one enthusiastic
                review cannot beat a project with a real body of them. */}
            <SelectItem value="rating">{SORT_LABELS.rating}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          aria-label="Filter by technology"
          defaultValue=""
          placeholder="Technology (press Enter)"
          className="sm:w-52"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const value = event.currentTarget.value.trim();
            if (value && !techs.some((tech) => tech.toLowerCase() === value.toLowerCase())) {
              setFilter("tech", [...techs, value]);
            }
            event.currentTarget.value = "";
          }}
        />
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Showing projects matching all of:</span>
          {apis.map((api) => (
            <FilterChip
              key={`api-${api}`}
              label={api}
              mono
              onRemove={() => setFilter("egov_api", apis.filter((item) => item !== api))}
            />
          ))}
          {techs.map((tech) => (
            <FilterChip
              key={`tech-${tech}`}
              label={tech}
              onRemove={() => setFilter("tech", techs.filter((item) => item !== tech))}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update({ search: null, egov_api: null, tech: null }, { resetPage: true })}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  mono,
  onRemove,
}: {
  label: string;
  mono?: boolean;
  onRemove: () => void;
}) {
  return (
    <Badge variant="secondary" className="gap-1 py-1 pl-2.5 pr-1">
      <span className={mono ? "font-mono text-[11px]" : undefined}>{label}</span>
      <button
        type="button"
        aria-label={`Remove filter ${label}`}
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <X aria-hidden className="size-3" />
      </button>
    </Badge>
  );
}

function splitFilter(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
