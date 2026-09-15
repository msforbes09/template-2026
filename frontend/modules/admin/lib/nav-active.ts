// Whether a sidebar entry is lit for the current route. Prefix-matched so a
// section's detail pages (/admin/projects/{uuid}) keep their section lit —
// exact matching deselected the whole sidebar on any detail screen. The
// dashboard root is the exception: as a prefix of every admin route it
// matches only itself. Query strings on the href (the log links carry them)
// are ignored; usePathname() never includes one.
export function isNavActive(pathname: string, href: string): boolean {
  const [hrefPath] = href.split("?");
  if (pathname === hrefPath) return true;
  return hrefPath !== "/admin" && pathname.startsWith(`${hrefPath}/`);
}
