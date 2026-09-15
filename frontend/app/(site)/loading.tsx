export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="h-12 w-2/3 max-w-xl animate-pulse rounded-lg bg-muted" />
      <div className="mt-5 h-5 w-full max-w-md animate-pulse rounded-md bg-muted" />
      <div className="mt-8 flex gap-3">
        <div className="h-11 w-36 animate-pulse rounded-lg bg-muted" />
        <div className="h-11 w-40 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
