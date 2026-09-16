import "server-only";
import { apiFetch } from "@/lib/api-client";
import { requireAdminSession } from "@/lib/auth/dal";
import type { Paginated } from "@/types/pagination";
import type { AdminBroadcast } from "@/types/broadcast";

// Broadcast history — GET administrator/broadcasts. Paginated, newest first,
// soft-deleted drafts excluded.
//
// Not cached. A row moves draft -> sending -> sent on its own once the
// fan-out runs, so a cached page would show "sending" long after it settled —
// and this list is the only place an administrator can see that it did.

export const BROADCASTS_PAGE_SIZE = 20;

export async function getBroadcasts(page = "1"): Promise<Paginated<AdminBroadcast>> {
  await requireAdminSession();

  const params = new URLSearchParams({
    per_page: String(BROADCASTS_PAGE_SIZE),
    page,
  });

  return apiFetch<Paginated<AdminBroadcast>>(
    `/broadcasts?${params.toString()}`,
    { cache: "no-store" },
    "admin",
  );
}

// One row, read from the list rather than a show endpoint — the API exposes
// no GET /broadcasts/{id}, and the edit screen only ever opens a draft the
// admin can already see in their history.
export async function findBroadcast(id: number): Promise<AdminBroadcast | null> {
  const page = await getBroadcasts("1");
  return page.data.find((broadcast) => broadcast.id === id) ?? null;
}
