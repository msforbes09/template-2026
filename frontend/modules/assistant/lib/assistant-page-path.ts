// The dedicated assistant page's route. Shared by the widget (which links to
// it, and hides itself once you're on it) and the page itself.
//
// In its own module with no "use client" and no "server-only" marker: the
// widget is a client component and the page is a Server Component, and both
// need the value.
export const ASSISTANT_PAGE_PATH = "/assistant";
