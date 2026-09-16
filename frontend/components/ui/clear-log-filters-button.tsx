"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// "Clear filters" for the URL-driven log lists. Self-contained: it reads the
// current search params, renders only when at least one filter is applied,
// and clears everything on click. Filters live in the URL, so clearing them
// is a navigation, not state — the list re-renders from a bare path.
//
// `keep` names params that scope the list rather than filter it (e.g. the
// admin gateway list's `user` uuid) — those survive the clear.
export function ClearLogFiltersButton({ keep = [] }: { keep?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const active = [...params.keys()].some((key) => key !== "page" && !keep.includes(key));
  if (!active) return null;

  const kept = new URLSearchParams();
  for (const key of keep) {
    const value = params.get(key);
    if (value) kept.set(key, value);
  }
  const target = kept.size > 0 ? `${pathname}?${kept.toString()}` : pathname;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 sm:ml-auto"
      onClick={() => router.replace(target, { scroll: false })}
    >
      <X aria-hidden className="size-3.5" />
      Clear filters
    </Button>
  );
}
