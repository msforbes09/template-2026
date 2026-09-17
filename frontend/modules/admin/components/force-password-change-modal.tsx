"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChangePasswordForm } from "@/modules/admin/components/change-password-form";
import { SignOutButton } from "@/modules/admin/components/sign-out-button";
import type { PasswordGateReason } from "@/modules/admin/lib/password-gate";

const COPY: Record<PasswordGateReason, string> = {
  temporary: "You're signing in with a temporary password. Choose a new one to continue.",
  expired:
    "Your password has expired and every postponement has been used. Choose a new one to continue.",
};

// Controlled open=true with a no-op onOpenChange: Base UI's dialog can only
// close by the `open` prop flipping, so ESC/outside-press/close-button all
// become inert. The only ways out are completing the password change — which
// signs the admin out and sends them to the login page to use it — or signing
// out directly.
export function ForcePasswordChangeModal({ reason }: { reason: PasswordGateReason }) {
  return (
    <Dialog open onOpenChange={() => {}} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update your password</DialogTitle>
          <DialogDescription>{COPY[reason]}</DialogDescription>
        </DialogHeader>
        {/* No onSuccess: a successful change ends the session and redirects to
            the login page, so there is nothing here left to refresh. This modal
            used to router.refresh() and let the gate re-check
            `with_temporary_password` — but the token was already revoked by
            then, so the profile read 401'd, the gate saw null and closed the
            modal, and the admin was left in a console that could not load
            anything. */}
        <ChangePasswordForm />
        <div className="flex justify-end border-t border-border pt-4">
          <SignOutButton />
        </div>
      </DialogContent>
    </Dialog>
  );
}
