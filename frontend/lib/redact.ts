// Strips credential material out of anything on its way to a log sink.
//
// Written because the reverse happened: a console.log(session) in the DAL put
// the auth cookie value and the upstream Bearer on stdout, and nothing between
// the call site and the sink was in a position to notice. logError() is the one
// sanctioned sink and it forwards to a third-party Slack workspace, so the
// scrub belongs there rather than in each of its ~40 callers.
//
// Two passes, because secrets arrive in two shapes:
//   - as OBJECT KEYS, when a caller hands over `extra: { accessToken }`;
//   - as TEXT, when the value is already interpolated into an error message or
//     a stack frame ("... Authorization: Bearer eyJhbGci...").
// Neither pass alone is enough.
//
// This is defence in depth, not a licence to pass secrets: the right fix is
// still to log an identifier (session.user.id) rather than the record.

// Matched against KEY NAMES. Deliberately does NOT include "session" or a bare
// "auth": redacting a whole `session` object would take `session.id` with it —
// the identifier a diagnostic actually wants — while its `token` and
// `accessToken` children are caught individually anyway, and "auth" would eat
// "author". Precision here is what keeps the surviving log worth reading.
const SENSITIVE_KEY =
  /(token|authorization|cookie|secret|password|passwd|credential|bearer|api[-_]?key)/i;

export const REDACTED = "[redacted]";

// Depth-bounded: an error payload can contain a cyclic or very deep object
// (a fetch Response, a Zod issue tree), and a logger must never be the thing
// that throws or hangs.
const MAX_DEPTH = 6;

// Masks values whose KEY looks sensitive, at any depth. Keys are matched, not
// values — a heuristic on values would either miss short tokens or redact
// ordinary prose.
export function redactKeys(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[truncated]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redactKeys(item, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactKeys(item, depth + 1);
  }
  return out;
}

// Masks credential-shaped runs inside free text — the case redactKeys cannot
// reach, because by then the value is part of a string rather than a field.
//
// Deliberately conservative about what counts as a secret: an over-eager
// pattern that ate ordinary words would make production stack traces useless,
// which is the thing this logger exists to deliver.
export function redactText(text: string): string {
  return (
    text
      // "Authorization: Bearer eyJ…" / "authorization=Bearer …"
      .replace(/\b(authorization|bearer)\b\s*[:=]?\s*(bearer\s+)?[\w\-._~+/]{8,}=*/gi, `$1 ${REDACTED}`)
      // A JSON or query fragment that names its own secret:
      // "accessToken":"…", token=…, set-cookie: app-client.session_token=…
      .replace(
        /("?\b[\w.-]*(token|secret|password|passwd|api[-_]?key|credential)[\w.-]*"?\s*[:=]\s*)"?[\w\-._~+/]{6,}=*"?/gi,
        `$1${REDACTED}`,
      )
      // A bare JWT anywhere in the text — three base64url segments.
      .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, REDACTED)
  );
}

// What a sink should call. Handles the two shapes together and never throws:
// a logger that fails takes out the error report and often the request with it.
export function redact<T>(value: T): T {
  try {
    if (typeof value === "string") return redactText(value) as T;
    return redactKeys(value) as T;
  } catch {
    return REDACTED as T;
  }
}
