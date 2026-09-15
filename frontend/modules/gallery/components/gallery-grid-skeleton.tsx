export function GalleryGridSkeleton({ items = 10 }: { items?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-hidden>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
