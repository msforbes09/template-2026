"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { swrFetcher } from "@/lib/swr-fetcher";
import type { PsgcOption } from "@/types/psgc";

type PsgcResource = "regions" | "provinces" | "municipalities" | "barangays" | "countries";

function buildQuery(params: Record<string, string> | undefined, search: string) {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) query.set(key, value);
  }
  return query.toString();
}

// Server-driven combobox for the Common API's PSGC lookups
// (region/province/municipality/barangay) and citizenship (/countries) — one
// generic component reused 5 times. `params` supplies the parent-code
// filters (e.g. {region_code} when picking a province); the SWR key changes
// whenever `params` changes, so cascading refetches happen for free.
export function PsgcCombobox({
  resource,
  params,
  value,
  onChange,
  placeholder,
  disabled = false,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  resource: PsgcResource;
  params?: Record<string, string>;
  value: PsgcOption | null;
  onChange: (option: PsgcOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = buildQuery(params, debouncedSearch);
  const { data, isLoading } = useSWR<{ data: PsgcOption[] }>(
    open ? `/api/psgc/${resource}?${query}` : null,
    swrFetcher,
  );

  const items = useMemo(() => {
    const list = data?.data ?? [];
    if (value && !list.some((item) => item.code === value.code)) {
      return [value, ...list];
    }
    return list;
  }, [data, value]);

  return (
    <Combobox
      items={items}
      value={value}
      onValueChange={(next) => onChange(next as PsgcOption | null)}
      onInputValueChange={(text) => setSearch(text)}
      onOpenChange={setOpen}
      // itemToStringLabel controls what the input *displays* once a value is
      // selected — itemToStringValue (not used here) only affects native
      // form-submission serialization, a different thing entirely.
      itemToStringLabel={(item: PsgcOption | null) => item?.name ?? ""}
      filter={null}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        className="h-11"
        showClear
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
      <ComboboxContent>
        <ComboboxEmpty>{isLoading ? "Searching…" : "No results found."}</ComboboxEmpty>
        <ComboboxList>
          {(item: PsgcOption) => (
            <ComboboxItem key={item.code} value={item}>
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
