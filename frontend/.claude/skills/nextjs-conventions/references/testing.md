# Testing Strategy

Read when writing tests or deciding what to test. The conventions in this skill create specific, testable seams — test those, and skip what the framework/library already guarantees.

## Tooling

- **Vitest** for unit/integration (fast, ESM-native, works with the `@/*` alias via `vitest-tsconfig-paths`).
- **React Testing Library** for component behavior (not implementation detail).
- **Playwright** for a thin layer of end-to-end happy-path flows (login → list → create → see row).
- Mock the **backend at the `fetch` boundary** (e.g. MSW) rather than mocking `apiFetch` itself, so the api-client logic (auth header, error mapping) is exercised.

## What to test (high value — these are the seams this skill defines)

- **Zod schemas** — valid input passes, invalid input produces the expected field errors. Pure and fast; cover edge cases here rather than in form tests.
- **Format utilities** (`lib/format.ts`) — PHP currency, date formats, relative time. Pure functions, trivial to test, easy to regress.
- **`ActionResult` mapping** — given a 422 `ApiError`, the action returns `{ ok: false, status: 422, errors }`; given success, `{ ok: true, data }`. Given a 5xx in production mode, the message is the generic one, not the raw error.
- **`buildApiError` / `isApiError`** — correct shape from each status; non-JSON body doesn't throw.
- **The DAL guard** — `requireSession` redirects when no token; returns the session when present. `getSession` is audience-correct (admin cookie → admin instance).
- **Route handlers** (combobox search) — 401 when unauthenticated, 200 + data when authed. This is the one client-reachable read, so it's worth covering.
- **Security seams** (`security.md`) — these are pure functions guarding the sharpest edges, so they are cheap to test and expensive to get wrong:
  - `serializeJsonLd` — a `</script>` in a backend-supplied string comes out escaped, and the value round-trips unchanged.
  - `sanitizeContentHtml` — script bodies, inline handlers, `javascript:` URLs and iframes are removed; a real editor document survives intact.
  - `safeErrorMessage` — 5xx is masked in production, 4xx passes through, a non-API error never passes through.
  - `redact` — the exact session shape comes back with `token`/`accessToken` masked and `id` intact.
  - `clientIpFromHeaders` — a client-supplied `cf-connecting-ip` loses; the right-most forwarded entry wins.
  - **The audience assertion** — a session row minted for one audience is rejected by the other's guard.
  - **The env production guard** — the parse throws when a secret falls back to its placeholder under `NODE_ENV=production` (`vi.stubEnv` + `vi.resetModules`, since `lib/env.ts` parses at import).
- **Form components** — submitting invalid data shows field errors via `AppFormField`; a 422 from the action maps to the right fields; success fires the toast and closes the modal. Test behavior the user sees, not internal state.

## What to test lightly or skip

- **Server Components that only fetch + render** — an integration/e2e test covers these better than a brittle unit test; don't unit-test the framework's rendering.
- **shadcn / Base UI primitives** — already tested upstream; don't re-test a `Button` or `Dialog`. Test *your* composition, not the primitive.
- **PPR / Suspense streaming mechanics** — framework behavior; cover the user-visible result in e2e, not the mechanism.
- **`proxy.ts` redirects** — it's an optimistic UX layer, not the security boundary (the DAL guard is). A light test of the cookie-presence branch is enough; the real auth assertion belongs on the guard.

## Patterns

```ts
// schema test — pure, exhaustive on edges
import { userSchema } from "@/modules/users/schemas/user-schema";

it("rejects empty name", () => {
  const r = userSchema.safeParse({ name: "", email: "a@b.com" });
  expect(r.success).toBe(false);
  if (!r.success) expect(r.error.flatten().fieldErrors.name).toBeTruthy();
});
```

```ts
// action result mapping — mock fetch to return a 422, assert the shape
it("maps 422 to field errors", async () => {
  server.use(http.post("*/users", () =>
    HttpResponse.json({ message: "Invalid", errors: { email: ["taken"] } }, { status: 422 })
  ));
  const res = await createUser({ name: "A", email: "a@b.com" });
  expect(res).toMatchObject({ ok: false, status: 422, errors: { email: ["taken"] } });
});
```

```tsx
// form behavior — what the user sees
it("shows a field error returned by the server", async () => {
  render(<UserForm onSubmit={() => Promise.resolve()} />);
  await user.type(screen.getByLabelText(/email/i), "bad");
  await user.click(screen.getByRole("button", { name: /save/i }));
  expect(await screen.findByText(/valid email/i)).toBeVisible();
});
```

> Guiding rule: test your own seams (schemas, mappers, guards, route handlers, form behavior) thoroughly; let e2e cover the wiring; don't re-test the framework or the component library. Coverage targets are less useful than covering every place this skill makes a decision (status branches, audience selection, dev/prod message switch).
