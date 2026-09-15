// Ported from design-study/light.html (the FEATURES section).
// Structure/layout/spacing classes are preserved verbatim; only color
// utilities are tokenized to the app's design tokens so it also works in
// dark mode. All icons in the source are inline <svg> (no data-lucide), so
// they are kept as inline JSX per the porting spec.
import { Reveal } from "@/components/ui/reveal";

export function Features() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative mx-auto w-full max-w-[1600px] px-6 pt-0 pb-0 sm:px-9 lg:px-16 lg:pt-0 lg:pb-0">
        <div className="pointer-events-none absolute left-6 top-0 hidden h-full w-px bg-border sm:left-9 md:block lg:left-16" />
        <div className="pointer-events-none absolute right-6 top-0 hidden h-full w-px bg-border sm:right-9 md:block lg:right-16" />

        <div className="relative border-x border-border">
          {/* Section header */}
          <Reveal className="grid gap-8 border-y border-border pt-16 pb-16 pl-6 pr-6 md:grid-cols-[1fr_0.72fr] md:items-end sm:px-8 lg:px-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.04em] text-primary">
                Features
              </div>
              <h2 className="max-w-[640px] text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Everything you need to{" "}
                <span className="text-primary">ship an integration.</span>
              </h2>
            </div>
            <p className="max-w-[430px] text-base leading-7 text-muted-foreground md:justify-self-end">
              One authentication model, one set of conventions, and the eGov
              staging environment behind every service, so teams can build against
              government APIs with confidence.
            </p>
          </Reveal>

          {/* Feature cards */}
          <Reveal className="grid border-b border-border lg:grid-cols-3">
            <style>{`
              @keyframes float-soft { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
              @keyframes float-soft-delayed { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
              @keyframes pulse-soft { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.96); opacity: 0.85; } }
              @keyframes slide-x-soft { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
              @keyframes scale-y-up { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.1); } }
              @keyframes scale-y-down { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.9); } }
              @keyframes shimmer-soft { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }
              .anim-float { animation: float-soft 4s ease-in-out infinite; }
              .anim-float-delayed-1 { animation: float-soft-delayed 5s ease-in-out infinite 1s; }
              .anim-float-delayed-2 { animation: float-soft 4.5s ease-in-out infinite 0.5s; }
              .anim-float-delayed-3 { animation: float-soft-delayed 6s ease-in-out infinite 2s; }
              .anim-pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }
              .anim-slide-x-1 { animation: slide-x-soft 4s ease-in-out infinite; }
              .anim-slide-x-2 { animation: slide-x-soft 5s ease-in-out infinite 1s; }
              .anim-slide-x-3 { animation: slide-x-soft 4.5s ease-in-out infinite 0.5s; }
              .anim-bar-1 { animation: scale-y-up 3s ease-in-out infinite; transform-origin: bottom; }
              .anim-bar-2 { animation: scale-y-down 4s ease-in-out infinite 0.5s; transform-origin: bottom; }
              .anim-bar-3 { animation: scale-y-up 3.5s ease-in-out infinite 1s; transform-origin: bottom; }
              .anim-bar-4 { animation: scale-y-down 4.5s ease-in-out infinite 0.2s; transform-origin: bottom; }
              .anim-bar-5 { animation: scale-y-up 4s ease-in-out infinite 0.8s; transform-origin: bottom; }
              .anim-shimmer { animation: shimmer-soft 3s ease-in-out infinite; }
            `}</style>

            {/* Card 1 · Sandbox first */}
            <article className="group border-b border-border pt-10 pb-10 pl-10 pr-10 transition-colors duration-300 hover:bg-muted sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-16 xl:pl-10 xl:pr-10 xl:pt-10 xl:pb-10">
              <div className="mb-9">
                <div className="relative h-[180px] overflow-hidden rounded-[30px] border border-border bg-gradient-to-br from-white via-blue-50/80 to-cyan-50/70 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.09)] transition-all duration-500 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-[0_34px_80px_rgba(37,99,235,0.14)]">
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
                  <div className="absolute -bottom-14 left-6 h-28 w-28 rounded-full bg-cyan-200/45 blur-3xl" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-[size:28px_28px] opacity-60" />
                  <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/85 px-2.5 py-1 text-[10px] font-medium text-primary shadow-sm backdrop-blur anim-float">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(37,99,235,0.12)]" />
                    Sandbox
                  </div>
                  <div className="relative z-10 flex h-full flex-col justify-between rounded-[24px] border border-white/80 bg-card/90 p-3 shadow-[0_16px_36px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(37,99,235,0.12)]" />
                        <span className="h-2.5 w-12 rounded-full bg-muted" />
                        <span className="h-2.5 w-7 rounded-full bg-muted" />
                      </div>
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">200 OK</span>
                    </div>
                    <div className="relative mt-3 space-y-2">
                      <div className="absolute left-[19px] top-7 h-[56px] w-px bg-gradient-to-b from-blue-200 via-cyan-200 to-transparent" />
                      <div className="relative flex items-center gap-2.5 rounded-[18px] border border-border bg-card p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-transform duration-500 group-hover:translate-x-1">
                        <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="h-2 w-24 rounded-full bg-muted" />
                          <div className="mt-1.5 h-1.5 w-16 rounded-full bg-muted anim-slide-x-1" />
                        </div>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_16px_rgba(37,99,235,0.22)] anim-pulse-soft">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        </span>
                      </div>
                      <div className="relative flex items-center gap-2.5 rounded-[18px] border border-border bg-card/85 p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-transform duration-500 group-hover:translate-x-2">
                        <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h4l2-6 4 12 2-6h4" /></svg>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="h-2 w-20 rounded-full bg-muted" />
                          <div className="mt-1.5 h-1.5 w-14 rounded-full bg-muted anim-slide-x-2" />
                        </div>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <div className="rounded-xl border border-border bg-muted p-1.5"><div className="h-1.5 w-7 rounded-full bg-primary/30" /></div>
                      <div className="rounded-xl border border-border bg-muted p-1.5"><div className="h-1.5 w-6 rounded-full bg-cyan-200" /></div>
                      <div className="rounded-xl border border-border bg-muted p-1.5"><div className="h-1.5 w-8 rounded-full bg-primary" /></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h3 className="text-base font-medium text-foreground">Sandbox by default</h3>
                  <p className="mt-3 max-w-[260px] text-sm leading-6 text-muted-foreground">Every service on this portal runs against the eGov staging environment — real endpoints and real responses, safely away from production.</p>
                </div>
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_12px_26px_rgba(37,99,235,0.22)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </span>
              </div>
            </article>

            {/* Card 2 · Secure & consented */}
            <article className="group border-b border-border pt-10 pb-10 pl-10 pr-10 transition-colors duration-300 hover:bg-muted lg:border-b-0 lg:border-r lg:py-16 xl:pl-10 xl:pr-10 xl:pt-10 xl:pb-10">
              <div className="mb-10">
                <div className="relative h-[190px] overflow-hidden rounded-[34px] border border-[#06145b]/10 bg-[#06145b] p-4 shadow-[0_28px_70px_rgba(6,20,91,0.22)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_38px_90px_rgba(6,20,91,0.30)]">
                  <div className="absolute -left-14 -top-14 h-36 w-36 rounded-full bg-blue-400/35 blur-3xl" />
                  <div className="absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-cyan-300/25 blur-3xl" />
                  <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
                  <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-medium text-white/80 shadow-sm backdrop-blur anim-float">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_0_4px_rgba(103,232,249,0.14)]" />
                    Consented
                  </div>
                  <div className="relative z-10 flex h-full flex-col justify-between rounded-[26px] border border-white/10 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                        <span className="h-2.5 w-14 rounded-full bg-white/25" />
                        <span className="h-2.5 w-8 rounded-full bg-white/15" />
                      </div>
                      <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/70">Verified</span>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-[24px] bg-white text-primary shadow-[0_18px_40px_rgba(0,0,0,0.24)] transition-transform duration-500 group-hover:scale-105 anim-pulse-soft">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>
                      </div>
                      <div className="flex-1 space-y-2.5 px-2">
                        <div className="h-2 w-full rounded-full bg-white/20 anim-slide-x-1" />
                        <div className="h-2 w-4/5 rounded-full bg-white/10 anim-slide-x-2" />
                        <div className="h-2 w-2/3 rounded-full bg-cyan-300/40 anim-slide-x-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h3 className="text-base font-medium text-foreground">Secure &amp; consented</h3>
                  <p className="mt-3 max-w-[260px] text-sm leading-6 text-muted-foreground">Consent-based access, scoped credentials and full audit logging on every call to citizen data.</p>
                </div>
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_12px_26px_rgba(37,99,235,0.22)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </span>
              </div>
            </article>

            {/* Card 3 · API documentation & integration */}
            <article className="group pt-10 pb-10 pl-10 pr-10 transition-colors duration-300 hover:bg-muted sm:px-8 lg:pl-10 lg:pr-10 lg:pt-10 lg:pb-10">
              <div className="mb-10">
                <div className="relative h-[190px] overflow-hidden rounded-[34px] border border-border bg-gradient-to-br from-blue-50 via-white to-cyan-50/70 p-4 shadow-[0_26px_70px_rgba(15,23,42,0.10)] transition-all duration-500 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-[0_36px_90px_rgba(37,99,235,0.14)]">
                  <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-cyan-200/60 blur-3xl" />
                  <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(226,232,240,0.65)_1px,transparent_1px),linear-gradient(to_bottom,rgba(226,232,240,0.65)_1px,transparent_1px)] bg-[size:28px_28px] opacity-60" />
                  <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/85 px-2.5 py-1 text-[10px] font-medium text-primary shadow-sm backdrop-blur anim-float">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(37,99,235,0.12)]" />
                    API Docs
                  </div>
                  <div className="relative z-10 flex h-full gap-3 rounded-[26px] border border-white/80 bg-card/70 p-3 shadow-[0_18px_44px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                    <div className="flex w-14 shrink-0 flex-col gap-2 rounded-[18px] border border-border bg-card p-2.5 shadow-sm transition-transform duration-500 group-hover:-translate-x-0.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>
                      </span>
                      <div className="mt-1 space-y-1.5">
                        <div className="h-1.5 w-full rounded-full bg-primary/40 anim-slide-x-1" />
                        <div className="h-1.5 w-4/5 rounded-full bg-muted" />
                        <div className="h-1.5 w-full rounded-full bg-muted" />
                        <div className="h-1.5 w-3/5 rounded-full bg-muted" />
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-[18px] border border-border bg-card p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="h-2 w-20 rounded-full bg-muted" />
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">GET</span>
                      </div>
                      <div className="mt-0.5 space-y-1.5">
                        <div className="h-1.5 w-full rounded-full bg-muted anim-slide-x-2" />
                        <div className="h-1.5 w-5/6 rounded-full bg-muted" />
                      </div>
                      <div className="mt-1 flex-1 rounded-[14px] border border-[#0b1f6b]/30 bg-[#06145b] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <div className="space-y-1.5">
                          <div className="h-1.5 w-2/3 rounded-full bg-cyan-300/70 anim-slide-x-1" />
                          <div className="h-1.5 w-1/2 rounded-full bg-white/25" />
                          <div className="h-1.5 w-3/4 rounded-full bg-primary/60 anim-slide-x-3" />
                          <div className="h-1.5 w-2/5 rounded-full bg-white/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h3 className="text-base font-medium text-foreground">API Documentation &amp; Integration</h3>
                  <p className="mt-3 max-w-[260px] text-sm leading-6 text-muted-foreground">Clear, versioned reference docs and consistent REST conventions for every service, so teams can integrate and ship faster.</p>
                </div>
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_12px_26px_rgba(37,99,235,0.22)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </span>
              </div>
            </article>
          </Reveal>

          {/* CTA strip */}
          <div className="grid items-center gap-8 border-b border-border bg-[radial-gradient(circle_at_2px_2px,rgba(148,163,184,0.35)_1px,transparent_0)] bg-[length:56px_56px] px-6 py-16 sm:px-8 md:grid-cols-[1fr_1.15fr_auto] lg:px-16 lg:py-20">
            <h3 className="text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-4xl">
              One platform.
              <br />
              <span className="text-primary">Every agency.</span>
            </h3>
            <p className="max-w-[460px] text-sm leading-6 text-muted-foreground">
              Join the agencies, LGUs and accredited partners building on eGov&apos;s
              shared API platform, one documented, governed integration surface.
            </p>
            <a href="/register" className="group relative inline-flex h-14 w-full items-center justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-[#2f6bff] via-[#2454f4] to-[#1237d8] pt-0 pb-0 pl-7 pr-3 text-[16px] font-semibold tracking-[-0.02em] text-white shadow-[0_18px_38px_rgba(37,84,244,0.28),inset_0_1px_0_rgba(255,255,255,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(37,84,244,0.36),inset_0_1px_0_rgba(255,255,255,0.38)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none sm:w-auto" aria-label="Request access">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/24 to-transparent opacity-80" />
              <span className="pointer-events-none absolute -right-12 -top-20 h-36 w-36 bg-white/20 blur-2xl transition-transform duration-500 group-hover:translate-x-3 group-hover:translate-y-3" style={{ borderRadius: "999px" }} />
              <span className="relative z-10 whitespace-nowrap">Request access</span>
              <span className="relative z-10 ml-4 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-white/15 bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-md transition-all duration-300 group-hover:bg-white/22 group-hover:translate-x-0.5 motion-reduce:transition-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none">
                  <path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
