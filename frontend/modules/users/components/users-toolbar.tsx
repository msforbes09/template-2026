"use client";

import { SearchFilterInput } from "@/components/ui/search-filter-input";

// Search only. Status and type filtering live in the sidebar's Users submenu
// (users-status-nav.tsx), which drives the same ?status= / ?type= params —
// duplicating them here as dropdowns was two ways to do one thing.
export function UsersToolbar() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchFilterInput
        label="Search users"
        placeholder="Search by name, email, or mobile…"
        className="sm:max-w-xs"
      />
    </div>
  );
}
