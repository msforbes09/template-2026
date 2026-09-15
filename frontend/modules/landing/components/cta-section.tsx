import { Suspense } from "react";
import Link from "next/link";
import {
  ScrollText,
  FlaskConical,
  Landmark,
  User,
  ShieldCheck,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { getClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canCreateProjects } from "@/modules/client-auth/lib/account";

// Ported from design-study/light.html "Ready to build" CTA (#cta). Keeps the
// session-aware primary action; the orbit graphic is a decorative CSS scene
// (keyframes in globals.css, paused under reduced-motion via `.orbit-scene`).

async function CtaActions() {
  const session = await getClientSession();
  // Same rule as the hero: only a developer is sent to the in-dashboard
  // catalog; a basic account would only meet the developer-account notice
  // there, so it gets the public catalog like a signed-out visitor.
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

function CtaActionsSkeleton() {
  return (
    <>
      <div aria-hidden className="h-14 w-52 animate-pulse rounded-lg bg-muted" />
      <div aria-hidden className="h-14 w-44 animate-pulse rounded-lg bg-muted" />
    </>
  );
}

// Both badges have to be things the product actually does. "24/7 monitoring"
// was neither implemented nor promised anywhere; every gateway call, by
// contrast, is logged with its request and response and is readable from the
// dashboard.
const badges = [
  { icon: ScrollText, label: "Every call logged" },
  { icon: FlaskConical, label: "Staging sandbox" },
] as const;

function OrbitGraphic() {
  return (
    <div
      className="orbit-scene relative flex min-h-[360px] w-full items-center justify-center overflow-hidden bg-muted/30 lg:h-full"
      style={{ perspective: "1200px" }}
    >
      {/* Panning dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[50%] opacity-40 will-change-transform"
        style={{
          backgroundImage:
            "radial-gradient(rgba(148,163,184,0.6) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          animation: "grid-pan 3s linear infinite",
        }}
      />
      {/* Orbit rings */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute h-[320px] w-[320px] rounded-full border-[1.5px] border-dashed border-border shadow-[inset_0_0_30px_rgba(148,163,184,0.15)] will-change-transform"
          style={{ animation: "orbit-spin 24s linear infinite" }}
        />
        <div
          className="absolute h-[180px] w-[180px] rounded-full border-[1.5px] border-dashed border-primary/40 shadow-[inset_0_0_20px_rgba(59,130,246,0.2)] will-change-transform"
          style={{ animation: "orbit-spin-reverse 16s linear infinite" }}
        />
      </div>
      {/* Crosshair */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 border-l border-dashed border-border"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-border"
      />
      {/* Center node */}
      <div
        className="group relative z-10 flex h-[104px] w-[104px] items-center justify-center rounded-2xl bg-card/90 shadow-[0_0_40px_rgba(29,78,216,0.15),inset_0_0_20px_rgba(255,255,255,0.9)] ring-1 ring-border backdrop-blur-md will-change-transform"
        style={{ animation: "float-y 5s ease-in-out infinite" }}
      >
        <div
          aria-hidden
          className="absolute -inset-8 rounded-full bg-primary/25 will-change-transform"
          style={{ animation: "pulse-aura 4s ease-in-out infinite", zIndex: -1 }}
        />
        <div className="relative z-10 grid grid-cols-2 gap-1.5">
          <span
            className="h-4 w-4 rounded-[3px] bg-primary will-change-transform"
            style={{ animation: "pulse-dot 2s ease-in-out infinite", animationDelay: "0s" }}
          />
          <span
            className="h-4 w-4 rounded-[3px] bg-primary will-change-transform"
            style={{ animation: "pulse-dot 2s ease-in-out infinite", animationDelay: "0.4s" }}
          />
          <span
            className="h-4 w-4 rounded-[3px] bg-primary will-change-transform"
            style={{ animation: "pulse-dot 2s ease-in-out infinite", animationDelay: "1.2s" }}
          />
          <span
            className="h-4 w-4 rounded-[3px] bg-primary will-change-transform"
            style={{ animation: "pulse-dot 2s ease-in-out infinite", animationDelay: "0.8s" }}
          />
        </div>
      </div>
      {/* Floating icon nodes */}
      <div className="absolute left-1/2 top-6 z-20 -translate-x-1/2">
        <div
          className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card/80 text-primary shadow-[0_15px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm will-change-transform"
          style={{ animation: "float-y 4s ease-in-out infinite", animationDelay: "0.5s" }}
        >
          <Landmark aria-hidden className="h-6 w-6" />
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
        <div
          className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card/80 text-primary shadow-[0_15px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm will-change-transform"
          style={{ animation: "float-y 4s ease-in-out infinite", animationDelay: "1.5s" }}
        >
          <User aria-hidden className="h-4 w-4" />
        </div>
      </div>
      <div className="absolute left-6 top-1/2 z-20 -translate-y-1/2">
        <div
          className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card/80 text-primary shadow-[0_15px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm will-change-transform"
          style={{ animation: "float-y 4s ease-in-out infinite", animationDelay: "1s" }}
        >
          <ShieldCheck aria-hidden className="h-4 w-4" />
        </div>
      </div>
      <div className="absolute right-6 top-1/2 z-20 -translate-y-1/2">
        <div
          className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card/80 text-primary shadow-[0_15px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm will-change-transform"
          style={{ animation: "float-y 4s ease-in-out infinite", animationDelay: "2s" }}
        >
          <Network aria-hidden className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative mx-auto w-full max-w-[1600px] px-6 pb-16 pt-20 sm:px-9 lg:px-16 lg:pt-28">
        <div
          id="cta"
          className="scroll-mt-24 border border-border bg-card p-10 shadow-[0_12px_40px_rgba(15,23,42,0.03)] sm:p-16 lg:p-20"
        >
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <div>
                <div className="mb-6 flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Ready to build
                </div>
                <h2 className="text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                  Build public services with{" "}
                  <span className="text-primary">eGov APIs.</span>
                </h2>
                <p className="mt-6 text-lg leading-7 text-muted-foreground">
                  Integrate eVerify, eGov SSO, eGovPay and more through one
                  documented platform. Access is granted after administrator
                  approval.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Suspense fallback={<CtaActionsSkeleton />}>
                    <CtaActions />
                  </Suspense>
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-4 text-sm font-normal text-muted-foreground">
                  {badges.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <div
                        key={badge.label}
                        className="flex items-center gap-2.5 border border-border bg-muted px-4 py-2"
                      >
                        <Icon aria-hidden className="h-4 w-4 text-primary" />
                        {badge.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
            <OrbitGraphic />
          </div>
        </div>
      </div>
    </section>
  );
}
