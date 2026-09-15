// Where the admin's collapsed/expanded sidebar choice lives.
//
// A cookie rather than localStorage so the SERVER can read it and render the
// right width in the first response. localStorage is only readable after
// hydration, which means every hard load would paint an expanded sidebar and
// then snap it shut — the one thing a remembered preference is supposed to
// avoid.
//
// Not httpOnly and not a secret: it is a UI preference, it is written from the
// client on toggle (see AdminSidebarShell), and the worst a tampered value can
// do is open a menu.
export const ADMIN_SIDEBAR_COOKIE = "admin_sidebar_collapsed";

// A year. The preference should outlive the session — an admin who collapses
// the sidebar means it, not just for today.
export const ADMIN_SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// "1" is collapsed. Anything else — including the cookie being absent — is
// expanded, so a first-time admin gets the full menu.
export const ADMIN_SIDEBAR_COLLAPSED_VALUE = "1";
