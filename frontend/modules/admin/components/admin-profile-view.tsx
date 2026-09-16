import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DetailField, DetailGrid } from "@/components/ui/detail-list";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import { requireAdminSession } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format-date";

// The signed-in admin's own account, read-only.
//
// Read-only is the API's shape, not a shortcut: the Administrators API exposes
// GET /profile with no PUT counterpart, so name, email and photo are only
// changeable by someone with administrators-manage editing the record from
// /admin/administrators. The one thing an admin can change about themselves is
// their password (POST /change-password), which is why that's the only action
// offered here.
export async function AdminProfileView() {
  await requireAdminSession();

  // Returns null on any read failure rather than throwing — surface that as an
  // inline state rather than letting it reach error.tsx, since a
  // Suspense-wrapped Server Component's throw doesn't reliably get there in
  // this app.
  const profile = await getAdminProfile();
  if (!profile) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load your profile"
        description="Your account details couldn't be read just now. Refresh the page, or sign out and back in if it keeps happening."
      />
    );
  }

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  const initials =
    [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-5">
        <Avatar className="size-14">
          {profile.photo?.url && <AvatarImage src={profile.photo.url} alt="" />}
          <AvatarFallback className="text-base font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold tracking-tight">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <StatusBadge active={profile.is_active === 1} />
      </div>

      {profile.with_temporary_password === 1 && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
        >
          <AlertTriangle aria-hidden className="mt-px size-4 shrink-0" />
          <p>
            You&apos;re still signing in with a temporary password. Use Change
            password in the account menu to set your own.
          </p>
        </div>
      )}

      <section aria-labelledby="admin-profile-account" className="flex flex-col gap-3">
        <h2 id="admin-profile-account" className="text-sm font-semibold tracking-tight">
          Account
        </h2>
        <div className="rounded-xl border border-border p-5">
          <DetailGrid>
            <DetailField label="First name">{profile.first_name || "—"}</DetailField>
            <DetailField label="Last name">{profile.last_name || "—"}</DetailField>
            <DetailField label="Email" span>
              {profile.email}
            </DetailField>
            <DetailField label="Last signed in">{formatDate(profile.last_login_at)}</DetailField>
            <DetailField label="Account created">{formatDate(profile.created_at)}</DetailField>
          </DetailGrid>
        </div>
      </section>

      <section aria-labelledby="admin-profile-access" className="flex flex-col gap-3">
        <h2 id="admin-profile-access" className="text-sm font-semibold tracking-tight">
          Roles and permissions
        </h2>
        <div className="flex flex-col gap-4 rounded-xl border border-border p-5">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Roles</p>
            {profile.roles?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.roles.map((role) => (
                  <Badge key={role.id} variant="secondary">
                    {role.name}
                  </Badge>
                ))}
              </div>
            ) : (
              // GET /profile returns `permissions` rather than `roles`, so this
              // is the expected case here — the permission list below is the
              // authoritative view of what this account can do.
              <p className="text-sm text-muted-foreground">
                Not listed on your own profile — see your permissions below.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Permissions ({profile.permissions?.length ?? 0})
            </p>
            {profile.permissions?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {[...profile.permissions].sort().map((permission) => (
                  <Badge key={permission} variant="outline" className="font-mono text-[11px]">
                    {permission}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No permissions reported.</p>
            )}
          </div>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck aria-hidden className="mt-px size-3.5 shrink-0" />
            {/* Worth stating outright: this is the single most confusing thing
                about the permission model in this console. */}
            These are a snapshot taken when you signed in. If your roles change,
            sign out and back in before the new access appears.
          </p>
        </div>
      </section>
    </div>
  );
}
