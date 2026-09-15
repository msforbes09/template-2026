import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireClientSession } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format-date";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { AddContactDialog } from "@/modules/client-auth/components/add-contact-dialog";
import { ProfileEditLink } from "@/modules/client-auth/components/profile-edit-link";
import { DeleteAccountCard } from "@/modules/client-auth/components/delete-account-card";
import type { ClientUserAddress } from "@/types/client-user";

export const metadata: Metadata = {
  title: "My profile",
  robots: { index: false, follow: false },
};

function formatFullAddress(address: ClientUserAddress | null): string {
  if (!address) return "—";
  const parts = [
    address.line_one,
    address.line_two,
    address.barangay?.name,
    address.municipality?.name,
    address.province?.name,
    address.region?.name,
    address.country?.name,
    address.postal_code,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

async function ProfileGuard() {
  await requireClientSession();
  const profile = await getClientProfile();

  // getClientProfile() only returns null on a genuine failure (no session
  // already redirected above via requireClientSession) — see its own
  // doc comment for why it swallows errors instead of throwing.
  if (!profile) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load your profile"
        description="Something went wrong loading your profile. Please try again."
      />
    );
  }

  const name = profile.display_name;
  // Deleting an account requires re-entering its password. Changing a
  // password needs an email to rewrite the session cookie with the token it
  // mints; an account registered by mobile has none. Same condition the
  // header uses to decide whether to offer "Change password".
  const hasPassword = Boolean(profile.email);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center sm:flex-row sm:text-left">
          <Avatar className="size-20 ring-2 ring-primary/15">
            {profile.photo?.url && <AvatarImage src={profile.photo.url} alt={name} />}
            <AvatarFallback
              aria-hidden
              className="bg-primary/10 text-2xl font-semibold text-primary"
            >
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
            <p className="text-sm text-muted-foreground">{profile.email ?? "—"}</p>
          </div>
          <ProfileEditLink />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2 text-foreground">
                <span>{profile.email ?? "Not set"}</span>
                {!profile.email && <AddContactDialog channel="email" />}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mobile number</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2 text-foreground">
                <span>{profile.mobile_number ?? "Not set"}</span>
                {!profile.mobile_number && <AddContactDialog channel="sms" />}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">First name</dt>
              <dd className="text-foreground">{profile.first_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Middle name</dt>
              <dd className="text-foreground">{profile.middle_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last name</dt>
              <dd className="text-foreground">{profile.last_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Suffix</dt>
              <dd className="text-foreground">{profile.suffix_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Company name</dt>
              <dd className="text-foreground">{profile.company_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Country</dt>
              <dd className="text-foreground">{profile.citizenship?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Birth date</dt>
              <dd className="text-foreground">{formatDate(profile.birth_date, "dd MMM yyyy")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Gender</dt>
              <dd className="text-foreground capitalize">{profile.gender ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Last login</dt>
              <dd className="text-foreground">
                {formatDate(profile.last_login_at, "dd MMM yyyy, h:mm a", "Never")}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{formatFullAddress(profile.address)}</p>
        </CardContent>
      </Card>

      {/* Last on the page on purpose — a destructive action shouldn't sit above
          the things people actually came here to read. */}
      {hasPassword && <DeleteAccountCard />}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-border p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="size-20 animate-pulse rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-52 animate-pulse rounded bg-muted" />
            <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>
      <div className="space-y-3 rounded-xl border border-border p-6">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted/60" />
          ))}
        </div>
      </div>
      <div className="space-y-3 rounded-xl border border-border p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileGuard />
      </Suspense>
    </div>
  );
}
