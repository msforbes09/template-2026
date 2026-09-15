"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ResourceModal } from "@/components/ui/resource-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userStatusLabel } from "@/modules/users/lib/user-status-label";
import { getUser } from "@/modules/users/actions/user-actions";
import type { AdminUser } from "@/types/admin-user";

function formatFullAddress(user: AdminUser): string {
  const address = user.address;
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

// A titled block of label/value pairs — the modal is sectioned rather than
// one long list, so an admin can jump to the question they came with.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-5">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

// Read-only show of one user. The list row has every field except
// `citizenship` (show-only per the API and unmasked contacts), so the modal
// is seeded with the row instantly and refreshed in the background rather
// than blocking behind a fetch every time it opens.
export function ViewUserModal({ user: initialUser }: { user: AdminUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(initialUser);

  function refresh() {
    getUser(initialUser.uuid).then((result) => {
      if (result.ok) {
        setUser(result.data);
      } else if (result.status === 401) {
        setOpen(false);
        router.push("/admin/login");
      }
    });
  }

  // Timestamps as the API's own Y-m-d H:i:s strings — exact, copy-pasteable
  // into the log viewers. Null rows vanish (last login says "Never" instead:
  // its absence is information, not noise).
  const timestamps: [string, string | null | undefined][] = [
    ["Registered", user.created_at],
    ["Profile completed", user.profile_completed_at],
    ["Last login", user.last_login_at ?? "Never"],
    ["Last updated", user.updated_at],
  ];

  return (
    <Tooltip>
      <ResourceModal
        open={open}
        onOpenChange={setOpen}
        onOpen={refresh}
        trigger={
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label={`View ${user.display_name}`}>
                <Eye aria-hidden className="size-4" />
              </Button>
            }
          />
        }
        title="User details"
        contentClassName="sm:max-w-2xl"
        stickyHeader={
          <div className="flex items-center gap-3">
            <Avatar className="size-20">
              {user.photo?.url && <AvatarImage src={user.photo.url} alt={user.display_name} />}
              <AvatarFallback aria-hidden className="text-2xl">
                {user.display_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{user.display_name}</p>
                {user.status && <Badge variant="secondary">{userStatusLabel(user.status)}</Badge>}
                {user.is_active === 0 && (
                  <Badge variant="secondary" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {[user.email, user.mobile_number].filter(Boolean).join(" · ") || "—"}
              </p>
              {user.company_name && (
                <p className="truncate text-sm text-muted-foreground/70">{user.company_name}</p>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <Section title="Personal details">
            <Field label="Birth date">{user.birth_date ?? "—"}</Field>
            <Field label="Gender">{user.gender ?? "—"}</Field>
            <Field label="Citizenship">{user.citizenship?.name ?? "—"}</Field>
            <Field label="Authentication">
              {user.authentication_channel === "sms"
                ? "SMS"
                : user.authentication_channel === "email"
                  ? "Email"
                  : "—"}
            </Field>
            <Field label="Address" wide>
              {formatFullAddress(user)}
            </Field>
          </Section>

          <Section title="Timeline">
            {timestamps.map(([label, value]) =>
              value ? (
                <Field key={label} label={label}>
                  <span className="tabular-nums">{value}</span>
                </Field>
              ) : null,
            )}
          </Section>
        </div>
      </ResourceModal>
      <TooltipContent>View details</TooltipContent>
    </Tooltip>
  );
}
