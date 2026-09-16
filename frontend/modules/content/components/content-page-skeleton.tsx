import { ContentBlockSkeleton } from "@/modules/content/components/content-block-skeleton";

// Mirrors <ContentPage>'s shell: eyebrow, heading, then the block grid.
export function ContentPageSkeleton() {
  return (
    <div className="bg-background">
      <div className="mx-auto w-full max-w-[1140px] px-6 pb-20 pt-14 sm:px-9 sm:pt-16 lg:pb-28 lg:pt-20">
        <div aria-hidden className="animate-pulse">
          <div className="mb-6 h-4 w-40 rounded bg-muted" />
          <div className="h-9 w-72 rounded-md bg-muted sm:h-12 sm:w-96" />
        </div>
        <div className="mt-10 lg:mt-14">
          <ContentBlockSkeleton />
        </div>
      </div>
    </div>
  );
}
