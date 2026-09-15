# Security

Read before writing any exported server action, any code that mints or reads a
session, anything that injects a string into the DOM, and anything that reads a
request header or writes to a log.

Every rule here was written after a real finding in a repo built on these
conventions. Two of those findings were caused *by this skill* — an unsafe
`JSON.stringify` in the JSON-LD example produced three identical stored-XSS holes,
and the documented `reportError` shipped an unvalidated public endpoint straight
into a team Slack channel. A conventions doc is what people copy, so a rule that
is merely absent here becomes a defect that is present everywhere.

The through-line: **decide what is trusted, and be explicit about it.** Almost
every finding was a value that arrived from outside being treated as though the
infrastructure had produced it.

## 1. An exported server action is a public HTTP endpoint

Its action ID ships in the client bundle. Next's only built-in gate is an
Origin/Host comparison that any HTTP client satisfies. "Only our form calls it" is
not a security property — it is an assumption about well-behaved callers.

Every exported action is one of two things, and you must know which:

- **Guarded** — calls `requireSession(audience)` before anything else
  (`auth.md`), or
- **Deliberately public** — and therefore validated with Zod, rate-limited, and
  output-escaped at whatever sink it writes to.

There is no third category. An action that "isn't worth guarding" is one nobody
has thought about yet.

> This is why `auth.md`'s guard rule says *every* protected action. The reason is
> not tidiness — an unguarded action is directly reachable with `curl`.

## 2. Minting a session: verify with the issuer first

The backend issues the token; the frontend only stores it. That means the frontend
**cannot** validate a token by inspecting it — it did not sign it and has no key.
So it must ask the issuer.

Before writing a session cookie:

1. Call the audience's own `/profile` (or equivalent) with the supplied token as
   `Bearer`, `cache: "no-store"`. A 200 proves the backend accepts it.
2. Require the returned identity to **match the claimed one**. A 200 alone only
   proves the token is real — not that it belongs to the name being claimed.
3. Stamp the **audience** on the session row (rule 3).
4. **Deny on any failure** — 401, unreachable, unparseable, no identifier. An
   unreachable backend must never become a way to mint an unverified session.

```ts
// lib/auth/verify-access-token.ts
export async function verifyAccessToken(
  audience: "admin" | "client",
  accessToken: string,
): Promise<VerifiedIdentity | null> {
  const res = await fetch(`${env.API_URL}${BASE_PATH[audience]}/profile`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    cache: "no-store", // a cached 200 would defeat the check entirely
  });
  if (!res.ok) return null;          // a forged token 401s — expected, not an incident
  // …return the identifiers the backend recognises for this token
}
```

Not `apiFetch`: that reads the token off an existing session, and the whole point
is that there isn't one yet.

The session writer returns a **discriminated result**, not `void` and not a throw
— it is awaited inside client form handlers that have no try/catch, so a throw is
an unhandled rejection and a `void` return lets a failed verification fall
straight through to `router.push()`: signed out, but on the dashboard.

```ts
export type WriteSessionResult = { ok: true } | { ok: false; message: string };
```

## 3. Assert the audience on read — a cookie name is not an assertion

`auth.md`'s multi-audience rule separates **cookie names**. That stops the two
sessions overwriting each other. It does **not** stop a row minted for one
audience satisfying the other's guard, because the instances share one secret and
one session shape.

Stamp `audience` when minting; require it when reading:

```ts
export const getAdminSession = cache(async () => {
  const result = await ctx.internalAdapter.findSession(token);
  if (!result || result.session.expiresAt < new Date()) return null;
  if (result.session.audience !== "admin") return null; // ← the assertion
  return result;
});
```

Without it, a citizen's token can be presented as the admin `Bearer` — including
to any endpoint that accepts a token "from whichever audience is calling."

Reject a row that lacks the field rather than grandfathering it.

## 4. Fail closed

A permission or verification helper that cannot resolve an answer **denies**.

The counter-example is worth internalising, because the fail-open version looks
reasonable right up until it doesn't:

```ts
// WRONG — "unknown means don't hide features that work"
if (!profile || !Array.isArray(profile.permissions)) return true;
```

Under a forged or junk session that inverts completely: `/profile` 401s, the
profile resolves to `null`, every permission answers *yes*, and the entire admin
console renders for a caller holding nothing. The fail-open branch is most
generous exactly when the session is most suspect.

```ts
if (!profile || !Array.isArray(profile.permissions)) return false;
```

Accept the cost: against a backend that doesn't return the field, gated controls
stay hidden. A missing control is recoverable; a rendered one that shouldn't exist
is not.

## 5. Never trust a client-settable header

`x-forwarded-for`'s **left-most** entry and `cf-connecting-ip` are caller-chosen.
A proxy that builds the header with `$proxy_add_x_forwarded_for` *appends* the
real peer, so index 0 is whatever arrived; and a header nothing in your topology
sets is a header anyone can send.

Read only what the trusted edge sets:

```ts
// lib/client-ip.ts
const candidates = [
  get("x-real-ip"),                          // nginx sets this from $remote_addr
  forwarded?.[forwarded.length - 1],         // RIGHT-most: the entry the proxy appended
];
```

Strip the rest at the proxy so the two halves cannot drift apart:

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header CF-Connecting-IP "";   # nothing legitimate sets this here
proxy_set_header True-Client-IP "";
```

This matters wherever the value is load-bearing:

- **Audit attribution.** A spoofable IP forwarded to the backend means the address
  recorded against credential generation, publication and logout is the caller's
  choice — the opposite of non-repudiation.
- **Rate-limit keys.** A caller-chosen key means a fresh bucket per request and no
  ceiling at all. Key on the edge-derived IP, and for signed-in callers key on the
  **user id**, not the session id — a session id is mintable per sign-in and
  usually carries the higher quota.
- **Bounded buckets.** An in-memory limiter needs a hard cap with eviction
  independent of expiry; collecting only *expired* entries leaves a burst of
  unique keys inside one window growing without bound, since every entry is live.

> An in-memory limiter is per-process and cannot bound spend across a restart or a
> second instance. For anything that costs money per request, put a `limit_req`
> floor at the proxy as well.

## 6. Escape before `<script>`, sanitize before HTML

Two different problems; don't reach for the wrong one.

**Into a `<script>` tag** (JSON-LD): the HTML tokenizer, not the JSON parser,
decides where the element ends — it scans for the literal `</script` whatever the
quoting. Escape `<`, `>`, `&` (and U+2028/9) as `\u00xx`; they are ordinary JSON
escapes, so the value round-trips byte-identically. → `lib/json-ld.ts`, and the
worked example in `seo.md`.

**Into the DOM as markup** (CMS/rich-text body): sanitize with an **allow-list**,
so a tag nobody anticipated fails closed. → `lib/sanitize-content.ts`

```ts
sanitizeHtml(html, {
  allowedTags: [...],                 // allow-list, never a block-list
  allowedSchemes: ["http", "https", "mailto", "tel"],   // kills javascript:/vbscript:
  allowProtocolRelative: false,
  nonTextTags: ["script", "style", "textarea", "noscript", "iframe"], // drop CONTENT too
  allowedStyles: {},                  // style="" is a CSS-injection surface
});
```

Dropping only the *tag* leaves a `<script>` body rendering as visible text —
`nonTextTags` is what removes the contents.

Both rules exist because `dangerouslySetInnerHTML` is the only way to render
either, and it does exactly what it says:

```tsx
// WRONG — backend HTML straight into the DOM
<div dangerouslySetInnerHTML={{ __html: content.body }} />
// WRONG — the tokenizer ends the script at the first </script in the data
<script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

// RIGHT
<div dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(content.body) }} />
<script dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
```

If you are typing `dangerouslySetInnerHTML` and the value did not come out of one
of those two helpers, stop.

Sanitize **once at the source**, before anything is derived from the string, not
at each injection site. Slicing and splitting neither add nor remove markup, so
cleaning at the source covers every derived fragment and cannot be forgotten when
a fifth site is added.

> Being admin-authored is not a defence. A server action is an HTTP endpoint
> (rule 1) and the schema is usually `z.string()`, so "it comes from our editor"
> describes the happy path, not the contract. Content read by anonymous visitors
> is the highest-value target in the app.

## 7. Logging hygiene: redact at the sink

Session and credential material must never reach stdout or a log aggregator.
A session record is the sharpest case — it typically holds *both* the raw cookie
value (replayable as the victim's session) and the upstream `Bearer`.

- **Never log the record.** Log an identifier: `session.user.id`, `session.id`.
- **Redact at the sink, not at the call sites.** There are dozens of call sites and
  one logger; only the logger can be relied on.
- **Two passes, because secrets arrive two ways** — as object *keys*
  (`{ accessToken }`) and as *text* already interpolated into a message or stack
  (`Authorization: Bearer …`). Neither pass alone is enough. → `lib/redact.ts`
- **Escape for the sink's markup.** If the sink renders markup (Slack mrkdwn), a
  message that closes its own code fence continues as markup — links, `<!channel>`,
  text impersonating another subsystem, inside the trusted incident channel.
- **`ErrorContext.extra` is an unconstrained escape hatch.** It invites callers to
  attach "just a bit of context" — headers, a request body, a session. It goes
  through the redactor like everything else.

Key matching should be precise. Redacting a key like `session` wholesale takes
`session.id` with it — the identifier a diagnostic actually needs — while its
`token`/`accessToken` children are caught individually anyway. A pattern matching
a bare `auth` will eat `author`.

## 8. Secrets never silently default

A server secret with a `.default()` that satisfies its own validator is worse than
a missing one: it boots. See `env.md`.

## 9. A control nothing runs is not a control

A lint rule that no pipeline executes has never failed anything. `next build` does
not run ESLint in Next 16, so a rule with no `prebuild` hook and no CI is
decoration:

```jsonc
{ "scripts": { "prebuild": "npm run lint && npm run test" } }
```

`prebuild` fires on every `npm run build`, including inside a Docker builder
stage, so no deploy path skips it.

Prefer `files:`-scoped exemptions over a global allow-list. A global
`no-console: ["error", { allow: ["error"] }]` leaves `console.error(session)` — the
same leak under a different identifier — passing cleanly everywhere.

> And be honest about what a rule reaches. `no-console` is debug hygiene: it
> catches an identifier, never the data. `console.error(session)` in an exempted
> file still passes. Rule 7 is the control that matters.

## Required helpers

Every project on these conventions has these. The rule is the point; these are the
reference implementations.

| Module | Rule | Purpose |
|---|---|---|
| `lib/auth/verify-access-token.ts` | 2 | Verify a token with its issuer before minting a session |
| `lib/client-ip.ts` | 5 | Derive the peer address from edge-set headers only |
| `lib/json-ld.ts` | 6 | `serializeJsonLd` — escape for injection into `<script>` |
| `lib/sanitize-content.ts` | 6 | `sanitizeContentHtml` — allow-list sanitizer for untrusted HTML |
| `lib/redact.ts` | 7 | `redact` — strip credential material by key and in free text |
| `lib/safe-error-message.ts` | — | Mask upstream 5xx text on the way out (`error-handling.md`) |

Each is a seam worth testing — see `testing.md`.
