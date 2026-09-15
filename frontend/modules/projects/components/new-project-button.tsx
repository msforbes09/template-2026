import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canCreateProjects } from "@/modules/client-auth/lib/account";

// The "New project" action, shown only to accounts the API would let create
// one. A basic account already gets DeveloperOnlyNotice in place of the list;
// offering the button beside it dangled a control that leads straight to the
// same notice on /dashboard/projects/new.
//
// Its own async component rather than a branch in the page: reading the
// profile is a dynamic API, and the page's header shell is static (PPR). The
// caller wraps this in Suspense, and getClientProfile is cache()-memoized per
// request, so this shares the read the list below already performs.
export async function NewProjectButton() {
  await requireClientSession();
  const profile = await getClientProfile();

  if (!profile || !canCreateProjects(profile)) return null;

  return (
    <Button
      nativeButton={false}
      render={<Link href="/dashboard/projects/new" />}
      className="gap-1.5"
    >
      <Plus aria-hidden className="size-4" />
      New project
    </Button>
  );
}
