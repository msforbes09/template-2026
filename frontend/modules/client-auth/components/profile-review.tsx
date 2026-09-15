import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompleteProfileButton } from "@/modules/client-auth/components/complete-profile-button";
import { formatDate } from "@/lib/format-date";
import type { ClientUserAddress, ClientUserProfile } from "@/types/client-user";

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

// The review step of the profile-completion funnel: a read-only look at what
// was just saved, with completing as the ONLY action. Deliberately none of
// the profile page's management widgets (edit link, add-contact dialogs,
// delete account) — this moment is for checking details, not managing the
// account.
export function ProfileReview({ profile }: { profile: ClientUserProfile }) {
  const name = profile.display_name;

  return (
    <div className="space-y-6">
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
            <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
            <p className="text-sm text-muted-foreground">{profile.email ?? "—"}</p>
          </div>
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
              <dd className="mt-1 text-foreground">{profile.email ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mobile number</dt>
              <dd className="mt-1 text-foreground">{profile.mobile_number ?? "Not set"}</dd>
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

      {/* No callout around it — the page header already says what this page
          is for. The button component itself carries the missing-fields
          alert and the 30-day cooldown note. */}
      <CompleteProfileButton />
    </div>
  );
}
