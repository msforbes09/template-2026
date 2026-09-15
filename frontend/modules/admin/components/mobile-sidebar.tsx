"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/logo";
import { AdminNav } from "@/modules/admin/components/admin-nav";
import type { LogNavPermissions } from "@/modules/admin/lib/log-nav-links";
import type { NavSectionPermissions } from "@/modules/admin/lib/nav-sections";

export function MobileSidebar({
  logs,
  sections,
  canBroadcast,
  canManageFeatureFlags,
}: {
  logs?: LogNavPermissions;
  sections?: NavSectionPermissions;
  canBroadcast?: boolean;
  canManageFeatureFlags?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" />}
      >
        <Menu aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Admin navigation</SheetTitle>
        <Link
          href="/admin"
          onClick={() => setOpen(false)}
          className="flex h-16 items-center border-b border-border px-6"
        >
          <Logo />
        </Link>
        <AdminNav
          onNavigate={() => setOpen(false)}
          logs={logs}
          sections={sections}
          canBroadcast={canBroadcast}
          canManageFeatureFlags={canManageFeatureFlags}
        />
      </SheetContent>
    </Sheet>
  );
}
