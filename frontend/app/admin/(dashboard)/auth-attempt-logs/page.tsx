import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AuthAttemptLogsList } from "@/modules/admin-logs/components/auth-attempt-logs-list";
import { AdminLogsSkeleton } from "@/modules/admin-logs/components/admin-logs-states";

export const metadata: Metadata = {
  title: "Auth Attempt Logs",
  robots: { index: false, follow: false },
};

type AuthAttemptLogsSearchParams = Promise<{
  event?: string;
  user_type?: string;
  user_id?: string;
  identifier?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

// Reads the searchParams promise itself, kept out of the page component so
// awaiting it doesn't push the static PageHeader behind loading.tsx too.
async function AuthAttemptLogsForParams({
  searchParams,
}: {
  searchParams: AuthAttemptLogsSearchParams;
}) {
  const {
    event = "",
    user_type: userType = "",
    user_id: userId = "",
    identifier = "",
    from = "",
    to = "",
    page = "1",
  } = await searchParams;
  return (
    <AuthAttemptLogsList
      event={event}
      userType={userType}
      userId={userId}
      identifier={identifier}
      from={from}
      to={to}
      page={page}
    />
  );
}

export default function AuthAttemptLogsPage({
  searchParams,
}: {
  searchParams: AuthAttemptLogsSearchParams;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Auth Attempt Logs"
        description="Read-only record of sign-in successes and failures across the admin console and the user site."
      />
      <Suspense fallback={<AdminLogsSkeleton filters={4} />}>
        <AuthAttemptLogsForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
