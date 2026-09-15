// The admin Projects submenu. Entries are QUEUES, not a bare status list —
// the useful cuts don't map one-to-one onto `status`:
//
//   Published  = approved AND live            (status=published, is_published=1)
//   Hidden     = approved but taken down      (status=published, is_published=0)
//                — the word the action uses ("Hide from public"), and the
//                one the events module already uses for this same flag.
//   Pending Changes = already live, with an update sitting in either review
//                     lane — the queue that says "the public sees the old
//                     version until someone acts on this". A live project the
//                     citizen is still editing is NOT here: it badges
//                     "Draft · Live" and no admin can act on it yet.
//
// Splitting them here is also what let the toolbar's visibility select go: the
// menu answers that axis where it means something, instead of offering a
// second control that wrote the same param.

export type AdminProjectMenuLink = { label: string; query: string };

export const ADMIN_PROJECT_MENU_LINKS: AdminProjectMenuLink[] = [
  { label: "Draft", query: "status=draft" },
  { label: "For Review", query: "status=for_assessment" },
  { label: "Needs Changes", query: "status=for_resubmission" },
  { label: "Ready to Publish", query: "status=for_publishing" },
  {
    label: "Pending Changes",
    query: "status=for_assessment,for_publishing&is_published=1",
  },
  { label: "Published", query: "status=published&is_published=1" },
  { label: "Hidden", query: "status=published&is_published=0" },
];

// Params a queue is defined by. Anything else in the URL (page, search, event,
// claimed) is the admin narrowing a queue, not leaving it, so it must not
// unhighlight the entry.
const QUEUE_PARAMS = ["status", "is_published"] as const;

// Whether `search` (the current URL's query string) is inside the queue
// `query` defines. Both sides are compared param by param, so
// `status=published` alone never matches the Published queue, which is
// specifically the LIVE half of it.
export function isProjectMenuActive(search: string, query: string): boolean {
  const current = new URLSearchParams(search);
  const target = new URLSearchParams(query);

  return QUEUE_PARAMS.every((param) => current.get(param) === target.get(param));
}
