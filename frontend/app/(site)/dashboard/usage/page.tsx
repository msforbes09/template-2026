import { redirect, permanentRedirect } from "next/navigation";

// /dashboard/usage moved into /dashboard/developers?tab=usage — the catalogue
// and the calls made against it answer one question and no longer sit on
// separate routes.
//
// Kept as a redirect rather than deleted: this URL is in the site nav's
// history, in the assistant's page map, in every "View usage" link that has
// ever been rendered, and quite possibly in somebody's bookmarks. A 404 would
// be a worse answer than a hop.
//
// The log's own filters ride along, so a link to a filtered view still lands
// on that filtered view rather than dumping the reader on page one.
export default async function UsageRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(raw)) {
    // `tab` is this page's answer, not the caller's to give.
    if (key === "tab") continue;
    const single = Array.isArray(value) ? value[0] : value;
    if (single) params.set(key, single);
  }
  params.set("tab", "usage");

  permanentRedirect(`/dashboard/developers?${params.toString()}`);
  // Unreachable — permanentRedirect throws. Present so the function's return
  // type stays honest if that ever changes.
  redirect("/dashboard/developers?tab=usage");
}
