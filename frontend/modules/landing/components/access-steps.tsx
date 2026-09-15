// The "How access works" section (#access) — eyebrow, heading, intro, three
// step cards and the closing CTA to the FAQs.
//
// Layout came from design-study/light.html and is kept verbatim; the COPY was
// rewritten against the implemented flow (see markdown/qa/landing-comment.md). What it used
// to say and why it was wrong:
//
//   - It showed Register → Review → Build, which skipped the step everything
//     depends on: approval is a SEPARATE application you submit from the
//     dashboard once your profile is complete. Registering does not queue you
//     for anything.
//   - Step 01's form claimed registration collects a declared use case, a
//     service selection and documents. It collects none of those — see
//     modules/client-auth/schemas/register-schema.ts.
//   - Step 02 said an administrator "issues" credentials per service and
//     environment. Approval unlocks the whole catalog at once, the developer
//     then mints their own key per catalog, and this portal has exactly one
//     environment.
//   - Step 03 showed a 99.9% uptime dial. No uptime figure exists anywhere in
//     the product, and the Terms of Service explicitly disclaim an availability
//     guarantee.
//
// The three mock cards are illustration and are aria-hidden: their numbers are
// invented, and a screen reader should not read them as this visitor's data.
import { Building2, FileCheck2, FilePlus2, ShieldCheck, User } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export function AccessSteps() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div
        id="access"
        className="relative mx-auto w-full max-w-[1600px] scroll-mt-24 px-6 pt-0 pb-0 sm:px-9 lg:px-16 lg:pt-0 lg:pb-0"
      >
        <div className="pointer-events-none absolute left-6 top-0 hidden h-full w-px bg-border sm:left-9 md:block lg:left-16" />
        <div className="pointer-events-none absolute right-6 top-0 hidden h-full w-px bg-border sm:right-9 md:block lg:right-16" />

        <div className="relative border-y border-border">
          <Reveal className="px-0 py-20 lg:px-12 lg:py-24">
            <div className="mb-6 inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
              How access works
            </div>
            <div className="grid gap-8 md:grid-cols-[0.9fr_1fr] md:items-start">
              <h2 className="max-w-[620px] text-4xl font-semibold leading-[1.04] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                From sign-up to your first call, fully{" "}
                <span className="text-primary">reviewed.</span>
              </h2>
              <div className="max-w-[460px] md:justify-self-end">
                <p className="text-base leading-7 text-muted-foreground">
                  Registration, review and scoped credentials in one workflow — so
                  access to citizen data stays behind vetted, accountable systems.
                </p>
                {/* Eligibility is a real gate that used to go unmentioned until
                    someone had already registered and waited for a review. */}
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  Access is intended for government agencies, accredited companies
                  and organizations with a legitimate integration need.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="grid border-t border-border lg:grid-cols-3">
            {/* step 01 · Register */}
            <Reveal
              className="group relative min-h-[420px] border-b border-border p-10 transition hover:bg-muted lg:border-b-0 lg:border-r lg:p-14"
              delay={0.06}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground/70">01</span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
                  Register
                </span>
              </div>
              <div aria-hidden className="mt-12 flex h-44 items-center justify-center">
                <div className="relative w-full max-w-[250px] rounded-2xl border border-border bg-card p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-foreground">
                    <FilePlus2 className="h-4 w-4 text-primary" aria-hidden />
                    Create your account
                  </div>
                  {/* The four fields registration actually asks for. */}
                  <div className="space-y-2.5 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                      Your name
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                      Organization
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                      Email or mobile
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                      Verify by OTP
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <h3 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                  Register, then complete your profile.
                </h3>
                <p className="mt-4 max-w-[360px] text-sm leading-6 text-muted-foreground">
                  Create an account with your name, organization and a verified
                  email or mobile number. Completing your profile is what unlocks
                  the next step.
                </p>
              </div>
            </Reveal>

            {/* step 02 · Review */}
            <Reveal
              className="group relative min-h-[420px] overflow-hidden border-b border-border bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.55),transparent_32%),linear-gradient(180deg,#0b2da8_0%,#06145b_100%)] p-10 text-primary-foreground shadow-[0_24px_70px_rgba(29,78,216,0.22)] lg:border-b-0 lg:border-r lg:p-14"
              delay={0.12}
            >
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-56 opacity-40"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)",
                  backgroundSize: "6px 6px",
                }}
              />
              <div className="relative flex items-center justify-between">
                <span className="text-sm font-medium text-primary-foreground/80">02</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary-foreground/80 ring-1 ring-white/15">
                  Apply
                </span>
              </div>
              <div aria-hidden className="relative mt-12 flex h-44 items-center justify-center">
                <div className="flex items-center gap-5">
                  <div className="space-y-3 text-primary">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                      <Building2 className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                      <FileCheck2 className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                      <User className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-[0_0_38px_rgba(96,165,250,0.75)]">
                    <ShieldCheck className="h-6 w-6" aria-hidden />
                  </div>
                  <div className="w-[180px] rounded-2xl border border-primary/30 bg-blue-700/45 p-5 shadow-[0_0_38px_rgba(96,165,250,0.35)] backdrop-blur">
                    <p className="text-xs text-primary-foreground/80">Administrator review</p>
                    <p className="mt-3 text-sm font-semibold text-emerald-200">● Approved</p>
                    <p className="mt-5 text-xs text-primary-foreground/80">Access</p>
                    {/* Approval is global, not a per-service grant. */}
                    <p className="text-2xl font-semibold tracking-tight">Full catalog</p>
                    <p className="mt-4 text-xs text-primary-foreground/80">Generate your keys →</p>
                  </div>
                </div>
              </div>
              <div className="relative mt-10">
                <h3 className="text-2xl font-semibold leading-tight tracking-tight">
                  Apply, and it gets reviewed.
                </h3>
                <p className="mt-4 max-w-[360px] text-sm leading-6 text-primary-foreground/80">
                  Apply for developer access from your dashboard. An administrator
                  reviews your profile and organization, then approves it or sends
                  it back with remarks.
                </p>
              </div>
            </Reveal>

            {/* step 03 · Build */}
            <Reveal
              className="group relative min-h-[420px] p-10 transition hover:bg-muted lg:p-14"
              delay={0.18}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground/70">03</span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
                  Build
                </span>
              </div>
              <div aria-hidden className="mt-12 flex h-44 items-center justify-center">
                <div className="w-full max-w-[250px] rounded-2xl border border-border bg-card p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
                  <div className="mb-4 flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Usage this month</span>
                    <span className="text-muted-foreground/70">30 days</span>
                  </div>
                  <div className="grid grid-cols-[76px_1fr] items-center gap-4">
                    {/* Success rate, not uptime: it is a figure this account's
                        own dashboard reports. The old 99.9% dial read as an SLA
                        the product does not offer and the Terms disclaim. */}
                    <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-[conic-gradient(#1D4ED8_0_97%,#e8eefb_97%_100%)] text-center">
                      <div className="flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-sm font-semibold text-slate-950">97.0%</span>
                        <span className="text-[10px] text-slate-500">Success</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-[10px] font-medium text-muted-foreground">
                      <p className="flex justify-between gap-2">
                        <span>● Success 2xx</span>
                        <span className="text-foreground">184,204</span>
                      </p>
                      <p className="flex justify-between gap-2">
                        <span>● Client 4xx</span>
                        <span className="text-foreground">312</span>
                      </p>
                      <p className="flex justify-between gap-2">
                        <span>● Errors 5xx</span>
                        <span className="text-foreground">0</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 h-12 rounded-xl bg-muted px-3 py-2">
                    <svg viewBox="0 0 160 36" className="h-full w-full" fill="none" aria-hidden="true">
                      <path
                        d="M2 28 C18 24 22 12 38 15 C54 18 58 8 74 10 C92 12 94 24 112 19 C132 14 136 7 158 8"
                        stroke="#1D4ED8"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <h3 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                  Build on staging, and monitor it.
                </h3>
                <p className="mt-4 max-w-[360px] text-sm leading-6 text-muted-foreground">
                  Generate scoped credentials per service yourself, build against
                  the eGov staging environment, and watch request volume, latency
                  and errors from the same dashboard.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="grid items-center gap-6 border-t border-border pt-16 pb-16 md:grid-cols-[1fr_auto] md:items-center lg:px-12 lg:py-20">
            <div>
              <p className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
                From sign-up to your first call.
              </p>
              <p className="mt-1 text-3xl font-semibold leading-tight tracking-tight text-muted-foreground/70">
                One platform. Full oversight.
              </p>
            </div>
            <a
              href="/faqs"
              className="group relative inline-flex h-14 w-full items-center justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-[#2f6bff] via-[#2454f4] to-[#1237d8] pt-0 pb-0 pl-7 pr-3 text-[16px] font-semibold tracking-[-0.02em] text-white shadow-[0_18px_38px_rgba(37,84,244,0.28),inset_0_1px_0_rgba(255,255,255,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(37,84,244,0.36),inset_0_1px_0_rgba(255,255,255,0.38)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none sm:w-auto"
              aria-label="Read the FAQs"
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/24 to-transparent opacity-80" />
              <span
                className="pointer-events-none absolute -right-12 -top-20 h-36 w-36 bg-white/20 blur-2xl transition-transform duration-500 group-hover:translate-x-3 group-hover:translate-y-3"
                style={{ borderRadius: "999px" }}
              />
              <span className="relative z-10 whitespace-nowrap">Read the FAQs</span>
              <span className="relative z-10 ml-4 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-white/15 bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-md transition-all duration-300 group-hover:bg-white/22 group-hover:translate-x-0.5 motion-reduce:transition-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                >
                  <path d="M7 7h10v10" />
                  <path d="M7 17 17 7" />
                </svg>
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
