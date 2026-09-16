"use client";

import { SearchFilterInput } from "@/components/ui/search-filter-input";

export function RolesToolbar() {
  return (
    <SearchFilterInput
      label="Search roles"
      placeholder="Search roles…"
      className="sm:max-w-xs"
    />
  );
}
