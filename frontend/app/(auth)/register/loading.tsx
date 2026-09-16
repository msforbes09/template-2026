export default function RegisterLoading() {
  return (
    <div aria-hidden className="grid min-h-dvh w-full lg:grid-cols-5">
      <div className="hidden bg-muted lg:col-span-3 lg:block" />
      <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-10 lg:col-span-2 lg:px-14">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5 py-10">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded-md bg-muted" />
          <div className="mt-3 h-11 animate-pulse rounded-lg bg-muted" />
          <div className="h-11 animate-pulse rounded-lg bg-muted" />
          <div className="h-11 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
