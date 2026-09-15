"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, KeyRound, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResourceModal } from "@/components/ui/resource-modal";
import { ChangePasswordForm } from "@/modules/client-auth/components/change-password-form";
import { clearClientSession } from "@/modules/client-auth/actions/session-actions";

// The citizen's account menu — the site header's counterpart to
// AdminUserMenu. Same shape, three differences the two audiences don't share:
//
// 1. A Dashboard entry. The header nav only shows dashboard links while the
//    citizen is inside /dashboard; on the marketing pages this menu is the
//    only route back, which is what the old name-as-a-link gave them.
// 2. Change password is conditional. It's absent for eGovPH SSO accounts
//    (no local password to change) and for accounts with no email — the
//    change-password action needs one to rewrite the session cookie.
// 3. Sign-out returns to "/" rather than a login page.
export function ClientUserMenu({
  displayName,
  email,
  photoUrl,
  canChangePassword,
}: {
  displayName: string;
  email: string | null;
  photoUrl: string | null;
  // Resolved server-side from the presence of an
  // email — see SiteHeaderAuthArea.
  canChangePassword: boolean;
}) {
  const router = useRouter();
  const [changingPassword, setChangingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const initials = displayName.trim().charAt(0).toUpperCase() || "?";

  async function handleSignOut() {
    setSigningOut(true);
    await clearClientSession();
    // A FULL PAGE LOAD, not router.push. cacheComponents renders routes inside
    // React <Activity>, which hides a route on navigation instead of unmounting
    // it — so useState and raw DOM input values survive for the few most recent
    // routes. router.refresh() clears the RSC payload cache but NOT that state,
    // which means a soft sign-out can leave the previous user's email and
    // password sitting in the login form. Next's own docs prescribe
    // window.location for logout for exactly this reason.
    window.location.href = "/";
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Account menu for ${displayName}`}
              className="h-auto gap-2 px-1.5 py-1.5 sm:pr-2.5"
            />
          }
        >
          <Avatar className="size-7">
            {photoUrl && <AvatarImage src={photoUrl} alt="" />}
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-32 truncate text-sm font-medium">{displayName}</span>
          <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href="/dashboard" />}>
              <LayoutDashboard aria-hidden />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/profile" />}>
              <UserRound aria-hidden />
              Profile
            </DropdownMenuItem>
            {canChangePassword && (
              <DropdownMenuItem onClick={() => setChangingPassword(true)}>
                <KeyRound aria-hidden />
                Change password
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={signingOut} onClick={handleSignOut}>
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outside the menu — a dialog nested inside would unmount with it the
          moment the menu closes on selection. Only rendered when there's an
          email, which canChangePassword already guarantees. */}
      {canChangePassword && email && (
        <ResourceModal
          open={changingPassword}
          onOpenChange={setChangingPassword}
          title="Change password"
          description="Choose a strong password you don't use anywhere else."
          contentClassName="sm:max-w-md"
        >
          <ChangePasswordForm
            email={email}
            onSuccess={() => {
              setChangingPassword(false);
              toast.success("Password updated");
              // The action mints a new token and rewrites the session cookie,
              // so the server tree is refreshed rather than left on the old one.
              router.refresh();
            }}
          />
        </ResourceModal>
      )}
    </>
  );
}
