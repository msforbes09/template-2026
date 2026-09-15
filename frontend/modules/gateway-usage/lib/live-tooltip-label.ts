// The "Right now" chart's tooltip heading, from a bin's `offset` (seconds
// relative to now, so always <= 0 and usually fractional).
//
// Its own module because of the bug it exists to prevent. shadcn's
// ChartTooltipContent forwards the axis value to `labelFormatter` ONLY when
// that value is a string:
//
//   const value = !labelKey && typeof label === "string"
//     ? (config[label]?.label ?? label)
//     : itemConfig?.label
//
// This chart's x-axis is numeric (`type="number" dataKey="offset"`), so that
// test fails and the formatter is handed `itemConfig?.label` — the SERIES name,
// "Calls/sec". The old formatter called Number() on it, got NaN, and rendered
// "NaNs ago" on every hover, on both the citizen and the admin dashboard.
//
// The caller now reads `offset` off the row instead. `unknown` in rather than
// `number`, because the value still arrives from a chart library through an
// untyped payload — the guard is the point.
//
// The type check is deliberate and NOT a Number() coercion: Number(null),
// Number("") and Number([]) are all 0, so coercing reports "This second" — a
// confident, wrong answer — for three values that are not offsets at all. The
// rows this reads come from LiveRateBin, whose `offset` is a number, so
// anything else means the payload was not what we expected, and the honest
// output is no heading.
export function liveTooltipLabel(offset: unknown): string {
  if (typeof offset !== "number" || !Number.isFinite(offset)) return "";
  const ago = Math.abs(Math.round(offset));
  return ago === 0 ? "This second" : `${ago}s ago`;
}
