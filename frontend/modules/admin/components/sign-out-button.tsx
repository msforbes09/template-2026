"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAdminSession } from "@/modules/admin/actions/session-actions";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
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
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={loading}
      onClick={handleSignOut}
    >
      <LogOut aria-hidden className="size-4" />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
