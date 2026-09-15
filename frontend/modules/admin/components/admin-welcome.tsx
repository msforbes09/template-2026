import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import { welcomeLinks } from "@/modules/admin/lib/welcome-links";

// The admin landing page: no data beyond the memoized profile read the shell
// already performs. A project adds live figures here once its backend grows a
// summary endpoint.
export async function AdminWelcome() {
  const profile = await getAdminProfile();
  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "there";
  const roles = (profile?.roles ?? []).map((role) => role.name);
  const links = welcomeLinks(profile?.permissions ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {name}</h1>
        {roles.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">{roles.join(", ")}</p>
        )}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader>
                  <CardTitle>{link.label}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
