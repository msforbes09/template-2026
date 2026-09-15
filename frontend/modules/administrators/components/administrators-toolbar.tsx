"use client";

import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";

export function AdministratorsToolbar() {
  const params = useSearchParams();
  const update = useUpdateSearchParams();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchFilterInput
        label="Search administrators"
        placeholder="Search by name or email…"
        className="sm:max-w-xs"
      />
      <Select
        value={params.get("is_active") ?? "all"}
        onValueChange={(value) =>
          update({ is_active: value === "all" ? null : value }, { resetPage: true })
        }
      >
        <SelectTrigger aria-label="Filter by status" className="sm:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="1">Active</SelectItem>
          <SelectItem value="0">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
