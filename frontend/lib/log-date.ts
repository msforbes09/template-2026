// The date format every log list's `from`/`to` uses: plain YYYY-MM-DD, both
// ends inclusive, ranges spanning months.
//
// Shared rather than per-module because the citizen's own gateway-log list now
// takes the same range params as the admin lists (2026-08-17 handoff moved it
// onto OpenSearch and dropped `month`), so both audiences validate identically.

import { formatDate } from "@/lib/format-date";

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// `from`/`to` are validated before they're forwarded. A malformed value comes
// back as a 422 rather than being ignored, and these arrive straight from the
// URL where anything can be typed — so a value that isn't YYYY-MM-DD is dropped
// and the range simply stays open on that side.
export function isValidLogDate(value: string | null | undefined): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value);
}

// Every log viewer (gateway, connection, auth-attempt, audit) shows its
// timestamps in the same "Y-m-d H:i:s" shape the API stores them in, rather
// than the friendlier default `formatDate` uses elsewhere — an operator
// scanning logs wants sortable, copy-pasteable, second-precision values.
export const LOG_TIMESTAMP_FORMAT = "yyyy-MM-dd HH:mm:ss";

export function formatLogTimestamp(value: string | null | undefined): string {
  return formatDate(value, LOG_TIMESTAMP_FORMAT);
}
