export default function AdminDashboardLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
