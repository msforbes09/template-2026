"use client";

import { useId } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  CircleCheck,
  KeyRound,
  Radio,
  Timer,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Floating } from "@/components/ui/motion";

// Client leaf for the hero's dashboard mockup: a miniature of the signed-in
// /dashboard so visitors see what the portal looks like after login.
//
// It mirrors what that page actually leads with, which changed. The dashboard
// used to open on the API catalog grid; the catalogue moved to
// /dashboard/developers when it and the usage log were combined behind tabs.
// What a signed-in developer now sees first is their own traffic — the live
// trace, then the counts and calls over time — and then their per-API credit
// balances. This mirrors that order and those labels.
//
// Same three pieces as before and the same purpose: one main card with two
// cards floating over it. Only what they show has been brought up to date.
//
// Surfaces use design tokens so it adapts to dark mode; the always-blue
// credential card keeps literal white/blue text since it sits on a fixed brand
// gradient. Charts use the same --chart-* tokens as the real ones, so a mark
// means here what it means inside.
//
// Motion: tiles and bars grow in on view, the two small cards float
// continuously — all disabled under prefers-reduced-motion.

const EASE = [0.16, 1, 0.3, 1] as const;

// One day of hourly buckets, the dashboard's default window. Deliberately
// consistent with the tiles below rather than decorative: these sum to 1,240
// calls and 37 errors, which is the 97.0% the "Success rate" tile claims. A
// mockup whose own numbers disagree is a mockup nobody can read twice.
const SERIES = [
  { calls: 18, errors: 0 },
  { calls: 26, errors: 1 },
  { calls: 38, errors: 1 },
  { calls: 52, errors: 2 },
  { calls: 67, errors: 1 },
  { calls: 78, errors: 2 },
  { calls: 86, errors: 2 },
  { calls: 92, errors: 3 },
  { calls: 96, errors: 2 },
  { calls: 89, errors: 5 },
  { calls: 81, errors: 2 },
  { calls: 74, errors: 1 },
  { calls: 68, errors: 2 },
  { calls: 60, errors: 1 },
  { calls: 55, errors: 2 },
  { calls: 49, errors: 1 },
  { calls: 49, errors: 2 },
  { calls: 44, errors: 1 },
  { calls: 38, errors: 1 },
  { calls: 28, errors: 1 },
  { calls: 20, errors: 1 },
  { calls: 14, errors: 1 },
  { calls: 10, errors: 1 },
  { calls: 8, errors: 1 },
];

// Bars are successful calls and the line is errors, the same split the real
// chart draws — and, like it, both on ONE scale. The error line therefore rides
// just above the baseline, because on a healthy gateway that is where it
// belongs. Rescaling it to fill the plot would draw four failures as tall as
// eighty successes, which is the dual-axis lie in miniature.
const PLOT = SERIES.map((point) => ({
  successful: point.calls - point.errors,
  errors: point.errors,
}));
const PEAK = Math.max(...PLOT.map((point) => point.successful));

const TILES: { label: string; value: string; icon: LucideIcon }[] = [
  { label: "Calls", value: "1,240", icon: Activity },
  { label: "Success rate", value: "97.0%", icon: CircleCheck },
  { label: "Errors", value: "37", icon: AlertTriangle },
  { label: "Latency", value: "210ms", icon: Timer },
];

// Per-API balances in the remaining/allowance form the real card uses. Pools
// are listed, never summed — they are isolated per catalog, so a single total
// would be a figure the product does not have.
const CREDITS = [
  { platform: "egov-sso", remaining: "450", allowance: "500" },
  { platform: "everify", remaining: "500", allowance: "500" },
  { platform: "emessage", remaining: "88", allowance: "100" },
];

// The live trace: x runs 0 → 60 seconds with the newest sample at the RIGHT,
// the direction the real chart scrolls.
const LIVE_LINE =
  "M0,30 L6,26 L12,31 L18,18 L24,24 L30,12 L36,20 L42,9 L48,16 L54,7 L60,13";
const LIVE_AREA = `${LIVE_LINE} L60,36 L0,36 Z`;

export function HeroConsole() {
  const reduce = useReducedMotion();
  const liveFillId = useId();

  return (
    <div aria-hidden className="relative mx-auto h-[620px] w-full max-w-[760px]">
      <div className="absolute right-[2%] top-[17%] h-[360px] w-[360px] rounded-full bg-primary/5 blur-3xl" />

      {/* Main card: the signed-in dashboard, scaled down */}
      <div className="absolute left-0 top-[6%] w-[88%] overflow-hidden rounded-[18px] border border-border bg-card/85 shadow-[0_16px_44px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        {/* Welcome strip — mirrors the dashboard's welcome card */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-2 ring-primary/15">
              J
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                Welcome, Juan Dela Cruz
              </p>
              <p className="truncate text-xs font-medium text-muted-foreground/70">
                jdelacruz@email.com
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {/* The account-type badge the real header carries, beside the one
                action still on this page — generating credentials moved to the
                developers route with the catalogue. */}
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              Developer
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
              <UserRound aria-hidden className="size-3.5" />
              View profile
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <p className="text-base font-semibold tracking-tight text-foreground">
            API <span className="text-primary">usage</span>
          </p>

          {/* The four counts */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TILES.map((tile, index) => (
              <motion.div
                key={tile.label}
                className="rounded-lg border border-border bg-card px-2.5 py-2"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, delay: 0.1 + index * 0.05, ease: EASE }}
              >
                <span className="flex min-w-0 items-center gap-1 text-[9px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  <tile.icon aria-hidden className="size-2.5 shrink-0" />
                  <span className="truncate">{tile.label}</span>
                </span>
                <p className="mt-1 text-sm font-semibold tabular-nums tracking-tight text-foreground">
                  {tile.value}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Calls over time */}
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold tracking-tight text-foreground">
                Calls over time
              </p>
              <span className="text-[9px] text-muted-foreground">
                Last 24 complete hours
              </span>
            </div>
            <div className="relative mt-2 h-[54px]">
              <div className="flex h-full items-end gap-[2px]">
                {PLOT.map((point, index) => (
                  <motion.span
                    key={index}
                    className="flex-1 rounded-t-[2px]"
                    style={{
                      height: `${(point.successful / PEAK) * 100}%`,
                      // Tinted rather than a flat fill, matching the real bars.
                      background:
                        "linear-gradient(to bottom, color-mix(in oklch, var(--chart-1) 95%, transparent), color-mix(in oklch, var(--chart-1) 40%, transparent))",
                      transformOrigin: "bottom",
                    }}
                    initial={reduce ? false : { scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.5, delay: 0.25 + index * 0.02, ease: EASE }}
                  />
                ))}
              </div>
              {/* One unit per bar slot, so the line lands on bar centres. The
                  stroke is non-scaling: preserveAspectRatio="none" stretches x
                  ~26x more than y, which would otherwise smear it. */}
              <svg
                viewBox={`0 0 ${PLOT.length} 100`}
                preserveAspectRatio="none"
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <path
                  d={`M0,100 ${PLOT.map(
                    (point, index) =>
                      `L${index + 0.5},${100 - (point.errors / PEAK) * 100}`,
                  ).join(" ")} L${PLOT.length},100 Z`}
                  fill="var(--chart-3)"
                  fillOpacity={0.22}
                />
                <polyline
                  points={PLOT.map(
                    (point, index) =>
                      `${index + 0.5},${100 - (point.errors / PEAK) * 100}`,
                  ).join(" ")}
                  fill="none"
                  stroke="var(--chart-3)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            {/* Two series, so identity is never carried by colour alone. */}
            <div className="mt-2 flex items-center gap-3 text-[9px] font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span
                  aria-hidden
                  className="size-1.5 rounded-[1px]"
                  style={{ background: "var(--chart-1)" }}
                />
                Successful
              </span>
              <span className="inline-flex items-center gap-1">
                <span
                  aria-hidden
                  className="size-1.5 rounded-[1px]"
                  style={{ background: "var(--chart-3)" }}
                />
                Errors
              </span>
            </div>
          </div>

          {/* API credits */}
          <div>
            <p className="text-[11px] font-semibold tracking-tight text-foreground">
              API credits
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {CREDITS.map((pool, index) => (
                <motion.div
                  key={pool.platform}
                  className="flex items-center justify-between gap-1.5 rounded-lg border border-border px-2 py-1.5"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, delay: 0.55 + index * 0.06, ease: EASE }}
                >
                  <span className="min-w-0 truncate rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                    {pool.platform}
                  </span>
                  <p className="shrink-0 text-[11px] tabular-nums">
                    <span className="font-semibold text-foreground">{pool.remaining}</span>
                    <span className="text-muted-foreground">/{pool.allowance}</span>
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Blue floating card: credentials (fixed brand surface) */}
      <Floating
        className="absolute bottom-[11%] right-0 w-[360px] max-w-[72%] rounded-[18px] border border-blue-300/30 bg-[radial-gradient(circle_at_90%_20%,rgba(96,165,250,0.85),transparent_16%),linear-gradient(135deg,#0b2da8_0%,#071855_56%,#0c37c8_100%)] p-6 text-white shadow-[0_30px_60px_rgba(29,78,216,0.34),inset_0_1px_0_rgba(255,255,255,0.28)]"
        y={12}
        duration={6}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-50">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-blue-700">
              <Check aria-hidden className="h-3 w-3" />
            </span>
            Account access granted
          </span>
          <KeyRound aria-hidden className="h-8 w-8" />
        </div>
        <p className="mt-6 font-mono text-2xl font-semibold tracking-[-0.02em]">
          egov_api_••••7c2a
        </p>
        <p className="mt-3 text-sm leading-6 text-blue-50">
          Scoped keys, generated per service from your dashboard once an
          administrator approves your account.
        </p>
      </Floating>

      {/* Small chart card: the live trace. This slot used to hold a static
          "Live Activity" bar row; the dashboard now leads with a real
          per-second line fed by the gateway broadcast, so the miniature shows
          that instead — same heading, same icon, same newest-at-the-right
          direction the real one scrolls. */}
      <Floating
        className="absolute bottom-[1%] left-[5%] w-[250px] rounded-[16px] border border-border bg-card p-5 shadow-[0_16px_44px_rgba(15,23,42,0.07)]"
        y={9}
        duration={5}
        delay={0.8}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Radio aria-hidden className="size-3.5 text-muted-foreground" />
            Right now
          </p>
          {/* "Live" as text, not a bare dot — the real card does the same. */}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        </div>
        <svg
          viewBox="0 0 60 36"
          preserveAspectRatio="none"
          aria-hidden
          className="mt-4 h-[52px] w-full"
        >
          <defs>
            <linearGradient id={liveFillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <motion.path
            d={LIVE_AREA}
            fill={`url(#${liveFillId})`}
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, delay: 0.6, ease: EASE }}
          />
          <motion.path
            d={LIVE_LINE}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={reduce ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
          />
        </svg>
        <p className="mt-1 text-[10px] text-muted-foreground">calls per second</p>
      </Floating>
    </div>
  );
}
