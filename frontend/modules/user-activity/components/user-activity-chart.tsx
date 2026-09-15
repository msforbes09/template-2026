"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { consoleCardClassName } from "@/modules/admin/lib/console-card";
import { cn } from "@/lib/utils";
import { getEcho } from "@/lib/echo-client";
import type { UserActivityTotals } from "@/types/user-activity";

// Same private-administrators channel/event as UserActivityTotals, but this
// component only adds/removes its own listener — see the comment in
// user-activity-feed.tsx for why only that component ever calls
// echo.leave().
const CHANNEL = "administrators";
const STATS_EVENT = ".user.activities";

// Cardiac-monitor rendering, not a data plot: each `user.activities` tick
// with activity draws ONE ECG beat complex on a scrolling baseline, and the
// spike's height encodes the per_second value — 3/s beats taller than 1/s,
// linearly up to RATE_CAP (values above the cap all render full-height).
// Zero activity reads as a flatline. The trace itself is stylized; the
// exact numbers are always visible in each panel's live readout, which is
// what makes this honest rather than decorative. Each series gets its own
// separate panel — the two rates often tick with identical values, so
// sharing one plot area would just draw one trace on top of the other.
const SAMPLE_RATE = 60; // samples generated per second per trace — drives beat-shape fidelity
// How much history is visible across the panel. Points are positioned by
// elapsed real time (see draw()), not by array index, so this is free to
// tune independently of SAMPLE_RATE/panel width — it no longer trades off
// against how visible the scroll motion is (that used to force this short:
// packing more samples into the same width made the live tip's per-sample
// step sub-pixel and imperceptible once the panel filled).
const WINDOW_SEC = 15;
// Retention only — how many samples to keep around per trace, generous
// enough to always cover WINDOW_SEC. Not used for on-screen positioning.
const MAX_SAMPLES = SAMPLE_RATE * WINDOW_SEC;
const BEAT_MS = 320; // duration of one P-QRS-T complex
const RATE_CAP = 8; // events/sec that maps to a full-height spike
const MIN_AMP = 0.18; // floor so a 1/s beat is still clearly visible

const MONITOR_BG = "#0a1128"; // fixed device-screen navy, same in both themes
const GRID_MINOR = "rgba(148, 163, 255, 0.07)";
const GRID_MAJOR = "rgba(148, 163, 255, 0.14)";

// Trace colors validated with the dataviz skill's validate_palette.js
// against the MONITOR_BG surface (all-pairs CVD separation + contrast both
// PASS for all three); only the lightness-band check flags them as
// brighter than standard chart marks — deliberate for a glowing monitor
// trace, and safe because identity is never color-alone here (each trace
// has its own panel, direct label, and numeric readout).
const TRACES = [
  { key: "api_access", label: "API", color: "#34d399", textClass: "text-[#34d399]" },
  { key: "authenticated", label: "Sign-ins", color: "#22d3ee", textClass: "text-[#22d3ee]" },
  { key: "activated", label: "Approvals", color: "#fcd116", textClass: "text-[#fcd116]" },
] as const;

type Beat = { start: number; amp: number };
type TraceEngine = { samples: number[]; beats: Beat[]; generated: number };

// One normalized P-QRS-T complex over phase p ∈ [0, 1): small P bump, sharp
// Q-R-S spike (R peaks at 1), then a rounded T wave.
function ecgWave(p: number): number {
  if (p < 0.12) return 0.15 * Math.sin((p / 0.12) * Math.PI);
  if (p < 0.2) return 0;
  if (p < 0.26) return -0.18 * Math.sin(((p - 0.2) / 0.06) * Math.PI);
  if (p < 0.34) {
    const t = (p - 0.26) / 0.08;
    return t < 0.5 ? 2 * t : 2 * (1 - t);
  }
  if (p < 0.42) return -0.28 * Math.sin(((p - 0.34) / 0.08) * Math.PI);
  if (p < 0.55) return 0;
  if (p < 0.8) return 0.3 * Math.sin(((p - 0.55) / 0.25) * Math.PI);
  return 0;
}

// One beat per tick; its height is the value. 1/s stays visible via the
// floor, RATE_CAP/s (and above) is a full-height spike.
function scheduleBeat(engine: TraceEngine, count: number, now: number) {
  if (count <= 0) return;
  const amp = Math.max(MIN_AMP, Math.min(count, RATE_CAP) / RATE_CAP);
  engine.beats.push({ start: now, amp });
}

// The trace's value at an exact instant — the tallest active beat at that
// moment, or 0 between beats.
function valueAt(engine: TraceEngine, t: number): number {
  let beatValue = 0;
  for (const beat of engine.beats) {
    const p = (t - beat.start) / BEAT_MS;
    if (p >= 0 && p < 1) {
      const w = ecgWave(p) * beat.amp;
      if (Math.abs(w) > Math.abs(beatValue)) beatValue = w;
    }
  }
  return beatValue;
}

// Generate baseline/beat samples up to `now` (time-based, so the scroll
// speed is identical regardless of frame rate).
function advance(engine: TraceEngine, start: number, now: number) {
  const target = Math.floor(((now - start) / 1000) * SAMPLE_RATE);
  // Resync rather than stall or catch up unboundedly when the clock and the
  // engine disagree: a suspended tab jumps `target` far ahead, and dev
  // hot-reload can preserve an engine whose `generated` is ahead of a fresh
  // clock (which would otherwise freeze the trace permanently).
  if (engine.generated > target) engine.generated = target;
  if (target - engine.generated > MAX_SAMPLES) {
    engine.samples.length = 0;
    engine.generated = target - MAX_SAMPLES;
  }
  while (engine.generated < target) {
    const t = start + engine.generated * (1000 / SAMPLE_RATE);
    // No jitter between beats — 0 activity is a true flat line, not a
    // noisy hover-near-zero.
    engine.samples.push(valueAt(engine, t));
    engine.generated++;
  }
  if (engine.samples.length > MAX_SAMPLES) {
    engine.samples.splice(0, engine.samples.length - MAX_SAMPLES);
  }
  engine.beats = engine.beats.filter((beat) => now - beat.start < BEAT_MS);
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  engine: TraceEngine,
  color: string,
  start: number,
  now: number,
) {
  if (w === 0 || h === 0) return;
  ctx.fillStyle = MONITOR_BG;
  ctx.fillRect(0, 0, w, h);

  // ECG-paper grid: fine squares with a stronger line every 5th.
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 16) {
    ctx.strokeStyle = x % 80 === 0 ? GRID_MAJOR : GRID_MINOR;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 16) {
    ctx.strokeStyle = y % 80 === 0 ? GRID_MAJOR : GRID_MINOR;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  const baseY = h * 0.62;
  const amp = h * 0.42;

  // Dim idle-sweep baseline so the center line is always visible, even
  // before the first samples arrive.
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, Math.round(baseY) + 0.5);
  ctx.lineTo(w, Math.round(baseY) + 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (engine.samples.length < 2) return;

  // Every point is positioned by how long ago it was generated relative to
  // "now" — not by its array index — so the whole trace scrolls smoothly
  // and continuously every frame (not just the tip, and not in discrete
  // jumps synced to SAMPLE_RATE). "now" always sits a hair inside the right
  // edge; older points fall further left the longer ago they happened. This
  // is what lets WINDOW_SEC show more history without ever making the
  // motion imperceptible — pixel density and scroll smoothness are no
  // longer coupled.
  const RIGHT_EDGE_MARGIN_PX = 3;
  const sampleIntervalMs = 1000 / SAMPLE_RATE;
  const windowMs = WINDOW_SEC * 1000;
  const pxPerMs = w / windowMs;
  const lastSampleTime = start + engine.generated * sampleIntervalMs;
  const ageOfNewestMs = now - lastSampleTime; // in [0, sampleIntervalMs)
  const liveValue = valueAt(engine, now);
  const xForAge = (ageMs: number) => w - RIGHT_EDGE_MARGIN_PX - ageMs * pxPerMs;

  const trace = () => {
    ctx.beginPath();
    const count = engine.samples.length;
    engine.samples.forEach((value, index) => {
      const ageMs = (count - 1 - index) * sampleIntervalMs + ageOfNewestMs;
      const x = xForAge(ageMs);
      const y = baseY - value * amp;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(w - RIGHT_EDGE_MARGIN_PX, baseY - liveValue * amp); // "now"
    ctx.stroke();
  };
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  // Two-pass "glow": a wide translucent stroke under the crisp one.
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 5;
  trace();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  trace();

  // Pen-nib marker riding "now" — an explicit, always-present "this is
  // being written right now" cue.
  const nibY = baseY - liveValue * amp;
  ctx.beginPath();
  ctx.arc(w - RIGHT_EDGE_MARGIN_PX, nibY, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;
}

// One self-contained monitor strip: its own canvas, render loop, label, and
// readout for a single series.
function EcgMonitor({
  label,
  color,
  textClass,
  engine,
  rate,
}: {
  label: string;
  color: string;
  textClass: string;
  engine: TraceEngine;
  rate: number | null;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !wrapper || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rafId = 0;
    let lastDraw = 0;

    function frame(now: number) {
      rafId = requestAnimationFrame(frame);
      if (!canvas || !wrapper || !ctx) return;
      if (startRef.current == null) startRef.current = now;
      advance(engine, startRef.current, now);
      // Reduced motion: still show the trace, but settle for ~1 redraw/sec
      // instead of a continuously scrolling animation.
      if (reduceMotion && now - lastDraw < 1000) return;
      lastDraw = now;
      // Self-healing sizing checked every frame (instead of a ResizeObserver,
      // whose one-shot sizing left a stale mismatched bitmap that clipped the
      // trace out of view): keep the bitmap matched to the panel's CSS size ×
      // devicePixelRatio, and reassert the transform before every draw.
      const dpr = window.devicePixelRatio || 1;
      const w = wrapper.clientWidth;
      const h = wrapper.clientHeight;
      if (w === 0 || h === 0) return;
      const bitmapW = Math.round(w * dpr);
      const bitmapH = Math.round(h * dpr);
      if (canvas.width !== bitmapW) canvas.width = bitmapW;
      if (canvas.height !== bitmapH) canvas.height = bitmapH;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, w, h, engine, color, startRef.current, now);
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [engine, color]);

  return (
    <div
      ref={wrapperRef}
      className="relative min-h-32 flex-1 overflow-hidden rounded-lg bg-[#0a1128]"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`ECG-style live trace of ${label} events; spike height scales with events per second, flat when idle`}
        // canvas is a replaced element — absolute + inset-0 alone doesn't
        // stretch it to fill the wrapper the way it would a <div>; without
        // an explicit CSS size it falls back to its width/height attributes
        // (the physical backing-store pixels), rendering far oversized and
        // getting clipped by the wrapper's overflow-hidden.
        className="absolute inset-0 block size-full"
      />
      <div className="pointer-events-none absolute inset-x-3 top-2 flex items-center justify-between">
        <span className={cn("text-xs font-semibold tracking-wide", textClass)}>{label}</span>
        <span className={cn("font-mono text-sm tabular-nums", textClass)}>
          {rate != null ? `${rate}/s` : "—"}
        </span>
      </div>
    </div>
  );
}

// Connection status via useSyncExternalStore — same pattern/rationale as
// UserActivityFeed.
function subscribeConnectionStatus(callback: () => void) {
  return getEcho("admin").connector.onConnectionChange(callback);
}
function getConnectionStatusSnapshot() {
  return getEcho("admin").connectionStatus();
}
function getConnectionStatusServerSnapshot() {
  return "connecting" as const;
}

export function UserActivityChart({
  fillHeight = false,
  row = false,
}: {
  fillHeight?: boolean;
  // Side-by-side panels instead of stacked — stays stacked below `lg` so
  // three panels don't get cramped on narrower admin viewports.
  row?: boolean;
} = {}) {
  const status = useSyncExternalStore(
    subscribeConnectionStatus,
    getConnectionStatusSnapshot,
    getConnectionStatusServerSnapshot,
  );
  const [rates, setRates] = useState<Record<(typeof TRACES)[number]["key"], number> | null>(null);
  // Lazy useState rather than useRef: the engines are stable per-instance
  // mutable stores, but they're passed down as props during render, which a
  // ref's .current must not be (react-hooks/refs). They're never re-set, so
  // this never causes a render loop. Keyed by trace key (not array position)
  // so reordering TRACES can't silently mismatch an engine to the wrong
  // series.
  const [engines] = useState<Record<(typeof TRACES)[number]["key"], TraceEngine>>(() =>
    Object.fromEntries(
      TRACES.map((trace) => [trace.key, { samples: [], beats: [], generated: 0 }] as const),
    ) as unknown as Record<(typeof TRACES)[number]["key"], TraceEngine>,
  );

  useEffect(() => {
    const channel = getEcho("admin").private(CHANNEL);
    const handler = (payload: UserActivityTotals) => {
      setRates({
        authenticated: payload.authenticated.per_second,
        activated: payload.activated.per_second,
        api_access: payload.api_access.per_second,
      });
      const now = performance.now();
      scheduleBeat(engines.authenticated, payload.authenticated.per_second, now);
      scheduleBeat(engines.activated, payload.activated.per_second, now);
      scheduleBeat(engines.api_access, payload.api_access.per_second, now);
    };
    channel.listen(STATS_EVENT, handler);
    return () => {
      channel.stopListening(STATS_EVENT, handler);
    };
  }, [engines]);

  return (
    <Card className={cn(consoleCardClassName, fillHeight && "h-full")}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity aria-hidden className="size-4" />
          Live activity rate
        </CardTitle>
        <StatusBadge
          active={status === "connected"}
          activeLabel="Live"
          inactiveLabel={status === "connecting" ? "Connecting…" : "Disconnected"}
        />
      </CardHeader>
      <CardContent
        className={cn(
          "flex flex-col gap-3",
          row && "lg:flex-row",
          fillHeight && "min-h-0 flex-1",
        )}
      >
        {TRACES.map((trace) => (
          <EcgMonitor
            key={trace.key}
            label={trace.label}
            color={trace.color}
            textClass={trace.textClass}
            engine={engines[trace.key]}
            rate={rates ? rates[trace.key] : null}
          />
        ))}
      </CardContent>
    </Card>
  );
}
