"use client";

import { SearchFilterInput } from "@/components/ui/search-filter-input";

export function ContentsToolbar() {
  return (
    <SearchFilterInput
      label="Search content blocks"
      placeholder="Search by identifier…"
      className="sm:max-w-xs"
    />
  );
}
