"use client";

import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// The client half of the landing page's catalog section (#catalog): embla's
// state and the two arrow buttons, and nothing else.
//
// It is a shell around server-rendered children on purpose. `header`, `action`
// and the slides themselves are all built in ServiceCards, which is an async
// Server Component — the cards read the catalog, resolve logos and render
// <Link>s, none of which needs to ship to the browser. Only the scroll
// position is client state, so only that crosses the boundary (convention:
// client components at the leaves).
//
// The arrows live in the header row rather than floating over the rail, which
// is why they're passed `static`: shadcn positions them absolutely at
// -left-12/-right-12 by default, and at this section's padding that puts them
// off-screen on anything narrower than a desktop. Their disabled state is what
// tells you where you are in the rail — there are no dots, since the last card
// is always partly visible and does the same job.
export function CatalogCarousel({
  header,
  action,
  children,
}: {
  header: React.ReactNode;
  // The "Browse all APIs" link. Sits with the arrows so the whole control
  // cluster is in one place.
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Carousel
      opts={{ align: "start" }}
      // <Carousel> renders role="region" aria-roledescription="carousel", which
      // needs a name to be announced as anything more useful than "region".
      aria-label="eGov API catalog"
      className="w-full"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
        {header}
        <div className="flex shrink-0 items-center gap-3">
          {action}
          <div className="flex items-center gap-2">
            <CarouselPrevious className="static" />
            <CarouselNext className="static" />
          </div>
        </div>
      </div>
      <CarouselContent className="mt-10">{children}</CarouselContent>
    </Carousel>
  );
}
