// Locale thousands separators (e.g. 12345 -> "12,345") for stat totals.
export function formatNumber(value: number | null | undefined, fallback = "—"): string {
  if (value == null || Number.isNaN(value)) return fallback;
  return value.toLocaleString("en-US");
}
