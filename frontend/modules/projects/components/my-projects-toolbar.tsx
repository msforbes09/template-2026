"use client";

import { SearchFilterInput } from "@/components/ui/search-filter-input";

// Search only. The status filter was removed (2026-09-03): a citizen has a
// handful of projects on one screen, each carrying a status badge, so a
// filter over five statuses cost a control and a vocabulary to maintain
// without answering a question the list itself didn't already answer.
export function MyProjectsToolbar() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchFilterInput
        label="Search your projects"
        placeholder="Search by name…"
        className="sm:max-w-xs"
      />
    </div>
  );
}
