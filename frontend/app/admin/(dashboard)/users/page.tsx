import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { UsersList } from "@/modules/users/components/users-list";
import { UsersListSkeleton } from "@/modules/users/components/users-list-skeleton";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

type UsersSearchParams = Promise<{
  q?: string;
  is_active?: string;
  status?: string;
  // The account's capability axis (basic | developer), filtered server-side
  // and independent of the lifecycle status above.
  type?: string;
  // "me" filters to the one user the signed-in admin currently holds an
  // assessment claim on — the transfer dialog's "go to their record" link.
  claimed?: string;
  page?: string;
}>;

// Reads the searchParams promise itself — kept out of the page component so
// awaiting it doesn't force the whole page (including the static PageHeader
// below) behind the route's loading.tsx boundary. Only this Suspense-wrapped
// piece should wait on it.
async function UsersListForParams({
  searchParams,
}: {
  searchParams: UsersSearchParams;
}) {
  const { q = "", is_active = "", status = "", type = "", claimed = "", page = "1" } = await searchParams;
  return (
    <UsersList
      q={q}
      isActive={is_active}
      status={status}
      accountType={type}
      claimed={claimed}
      page={page}
    />
  );
}

export default function UsersPage({
  searchParams,
}: {
  searchParams: UsersSearchParams;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Browse portal user accounts." />
      <Suspense fallback={<UsersListSkeleton />}>
        <UsersListForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
