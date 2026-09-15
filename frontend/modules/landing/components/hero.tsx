import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { HeroConsole } from "@/modules/landing/components/hero-console";
import { getClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canCreateProjects } from "@/modules/client-auth/lib/account";

async function HeroActions() {
  const session = await getClientSession();
  // Only a developer has a personalized catalog behind the dashboard — a
  // basic account would land on "needs a developer account", so everyone
  // else (signed out included) goes to the public catalog below. The
  // profile read no-ops for signed-out visitors and is memoized for the
  // rest, so the common case pays nothing extra.
  const profile = await getClientProfile();
  const catalogHref =
    profile && canCreateProjects(profile) ? "/dashboard/developers" : "/api-catalogs";
  return (
    <>
      {!session && (
        <Button className="h-14 px-7 text-base" nativeButton={false} render={<Link href="/login" />}>
          Log in
        </Button>
      )}
      <Button
        variant="outline"
        className="h-14 px-7 text-base"
        nativeButton={false}
        render={<Link href={catalogHref} />}
      >
        Explore the catalog
      </Button>
    </>
  );
}

function HeroActionsSkeleton() {
  return (
    <>
      <div aria-hidden className="h-14 w-52 animate-pulse rounded-lg bg-muted" />
      <div aria-hidden className="h-14 w-44 animate-pulse rounded-lg bg-muted" />
    </>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative mx-auto grid w-full max-w-[1600px] items-center gap-12 px-6 pt-8 pb-8 sm:px-9 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-16 lg:pt-12 lg:pb-12">
        <div className="max-w-3xl">
          <Reveal>
            <div className="mb-6 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.04em] text-primary">
              eGov API marketplace
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="max-w-[680px] text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.06em] text-foreground sm:text-5xl lg:text-[3.5rem] xl:text-[4rem]">
              The first{" "}
              <span className="text-primary">Government-as-a-Service</span>{" "}
              platform.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-7 max-w-[590px] text-lg leading-8 text-muted-foreground sm:text-xl">
              Integrate identity, sign-in and data exchange through one
              documented platform — free to build on, within a per-service call
              allowance, once your access is approved.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:gap-5">
              <Suspense fallback={<HeroActionsSkeleton />}>
                <HeroActions />
              </Suspense>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.2} y={32} className="min-w-0">
          <HeroConsole />
        </Reveal>
      </div>
    </section>
  );
}
