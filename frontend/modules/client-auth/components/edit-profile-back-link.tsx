import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Back goes where Save goes, which depends on where the edit form sits in the
// account's lifecycle: draft and returned accounts are mid-funnel and belong
// on the dashboard (their journey card is the thing driving them here), while
// everyone else is editing from their profile page and returns to it.
export function EditProfileBackLink({ status }: { status: string | null }) {
  const toDashboard = status === "draft" || status === "for_resubmission";
  const href = toDashboard ? "/dashboard" : "/dashboard/profile";
  const label = toDashboard ? "Dashboard" : "My profile";

  return (
    <Link
      href={href}
      className="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <ArrowLeft
        aria-hidden
        className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
      />
      {label}
    </Link>
  );
}
