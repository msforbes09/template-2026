import { Suspense } from "react";
import { adminCan } from "@/modules/admin/lib/admin-can";

// Renders children only when the signed-in admin holds `permission` — the
// gate for a PageHeader's action slot, where a bare await would drag the
// page's static shell behind its loading boundary. The sync outer component
// keeps the shell static; the permission read streams into its own Suspense
// (null fallback: an action button appearing is fine, one flashing away is
// not). Like every adminCan() use this is presentation only — the WS
// abilities middleware still refuses the action itself.
export function Can({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <CanInner permission={permission}>{children}</CanInner>
    </Suspense>
  );
}

async function CanInner({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  return (await adminCan(permission)) ? <>{children}</> : null;
}
