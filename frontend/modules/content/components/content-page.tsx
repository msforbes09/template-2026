import { Suspense } from "react";
import { ContentBlock } from "@/modules/content/components/content-block";
import { ContentBlockSkeleton } from "@/modules/content/components/content-block-skeleton";

// CMS-backed page shell in the landing's design language: eyebrow + big
// heading + optional lede, then the block grid (rail + section cards) from
// <ContentBlock>. The shell is static — only the fetched content suspends —
// so the header band streams instantly (PPR).
export function ContentPage({
  identifier,
  title,
  kicker = "Developer Portal",
  lede,
}: {
  identifier: string;
  title: string;
  kicker?: string;
  lede?: string;
}) {
  return (
    <div className="bg-background">
      <div className="mx-auto w-full max-w-[1140px] px-6 pb-20 pt-14 sm:px-9 sm:pt-16 lg:pb-28 lg:pt-20">
        <div className="mb-6 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.04em] text-primary">
          <span
            aria-hidden
            className="h-px w-8 bg-gradient-to-r from-primary via-destructive to-highlight"
          />
          {kicker}
        </div>
        <h1 className="max-w-[720px] text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        {lede && (
          <p className="mt-5 max-w-[620px] text-base leading-7 text-muted-foreground">{lede}</p>
        )}
        <div className="mt-10 lg:mt-14">
          <Suspense fallback={<ContentBlockSkeleton />}>
            <ContentBlock identifier={identifier} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
