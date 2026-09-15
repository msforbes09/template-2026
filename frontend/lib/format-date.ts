import { format, isValid, parseISO } from "date-fns";

// Laravel's `timestamps()` columns are nullable by default, and apiFetch
// never validates response shape at runtime — a `string`-typed date field
// can still arrive null, empty, or malformed. Guard both cases here once
// instead of at every call site.
export function formatDate(
  value: string | null | undefined,
  dateFormat = "dd MMM yyyy, h:mm a",
  fallback = "—",
): string {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, dateFormat) : fallback;
}
