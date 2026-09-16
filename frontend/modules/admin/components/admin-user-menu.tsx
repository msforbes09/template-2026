"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
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
import { ChangePasswordForm } from "@/modules/admin/components/change-password-form";
import { clearAdminSession } from "@/modules/admin/actions/session-actions";

// The account menu in the admin header — replaces the old name block plus
// standalone sign-out button. Everything account-related now hangs off one
// control instead of competing for header width.
//
// A client leaf: the header itself stays a Server Component and passes the
// already-fetched profile down as plain data.
export function AdminUserMenu({
  firstName,
  lastName,
  email,
  photoUrl,
}: {
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
}) {
  const [changingPassword, setChangingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const name = [firstName, lastName].filter(Boolean).join(" ");
  const initials =
    [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";

  async function handleSignOut() {
    setSigningOut(true);
    await clearAdminSession();
    // A FULL PAGE LOAD, not router.push. cacheComponents renders routes inside
    // React <Activity>, which hides a route on navigation instead of unmounting
    // it — so useState and raw DOM input values survive for the few most recent
    // routes. router.refresh() clears the RSC payload cache but NOT that state,
    // which means a soft sign-out can leave the previous user's email and
    // password sitting in the login form. Next's own docs prescribe
    // window.location for logout for exactly this reason.
    window.location.href = "/admin/login";
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              // The name is the accessible label on wide screens, but it's
              // hidden below sm — so the whole control carries its own name
              // rather than relying on text that may not be rendered.
              aria-label={`Account menu for ${name || email}`}
              className="h-auto gap-2 px-1.5 py-1.5 sm:pr-2.5"
            />
          }
        >
          <Avatar className="size-8">
            {photoUrl && <AvatarImage src={photoUrl} alt="" />}
            <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">{name}</span>
          <ChevronDown aria-hidden className="hidden size-4 text-muted-foreground sm:inline" />
        </DropdownMenuTrigger>

        {/* align="end" so the panel hangs from the right edge of the header,
            and an explicit width because the content defaults to the
            trigger's, which is only as wide as the avatar on mobile. */}
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href="/admin/profile" />}>
              <UserRound aria-hidden />
              Profile
            </DropdownMenuItem>
            {/* Opens the modal rather than navigating: the form is short and
                the admin is usually mid-task somewhere else. */}
            <DropdownMenuItem onClick={() => setChangingPassword(true)}>
              <KeyRound aria-hidden />
              Change password
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={signingOut} onClick={handleSignOut}>
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rendered outside the menu with no trigger of its own — a dialog
          nested inside the menu would unmount with it the moment the menu
          closes on selection. */}
      <ResourceModal
        open={changingPassword}
        onOpenChange={setChangingPassword}
        title="Change password"
        description="Choose a strong password you don't use anywhere else."
        contentClassName="sm:max-w-md"
      >
        <ChangePasswordForm
          // Closes this dialog before the form's redirect unmounts it. The
          // success toast comes from the form, which also signs the admin out —
          // every token is revoked by the change.
          onSuccess={() => setChangingPassword(false)}
        />
      </ResourceModal>
    </>
  );
}
