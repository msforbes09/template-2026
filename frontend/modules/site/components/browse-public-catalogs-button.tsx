import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canCreateProjects } from "@/modules/client-auth/lib/account";

// The public face of the catalog, for accounts that cannot open the real
// one yet: a developer already has the full in-dashboard catalog right
// below, so for them this link is a worse copy of the page they are on and
// renders nothing. Mirrors NewProjectButton — its own async component so the
// page header shell stays static, sharing the memoized profile read.
export async function BrowsePublicCatalogsButton() {
  await requireClientSession();
  const profile = await getClientProfile();

  if (profile && canCreateProjects(profile)) return null;

  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link href="/api-catalogs" target="_blank" rel="noreferrer noopener" />}
      className="gap-1.5"
    >
      Browse public catalogs
      <ArrowUpRight aria-hidden className="size-4" />
    </Button>
  );
}
