export default function EditProfileLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <div aria-hidden className="h-5 w-28 animate-pulse rounded bg-muted/60" />
      <div aria-hidden className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div aria-hidden className="space-y-4 rounded-xl border border-border p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-md bg-muted/60" />
        ))}
      </div>
    </div>
  );
}
