# API Contract (Laravel / 3rd-party JSON API)

## Success shape

Every successful response carries a `data` key. List endpoints add `meta` for pagination.

```jsonc
// GET /users/123
{ "data": { "id": "123", "name": "Vincent", "email": "v@example.com" } }

// GET /users?page=1
{
  "data": [ /* User[] */ ],
  "meta": { "current_page": 1, "last_page": 5, "per_page": 15, "total": 73 }
}
```

## Error shapes by status

### 422 — Validation
```jsonc
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."],
    "name": ["The name must be at least 2 characters."]
  }
}
```
Handling: map each key in `errors` to React Hook Form via `setError(field, { message: errors[field][0] })`. Show top-level `message` via `form.setError("root", { message })` → rendered by `FormRootError`.

### 401 — Unauthenticated
```jsonc
{ "message": "Unauthenticated." }
```
Handling: session expired → redirect to `/login`.

### Other non-2xx (403, 404, 409, 500, …)
```jsonc
{ "message": "Human-readable error." }
```
Handling: show `message` as a destructive alert (toast or `FormRootError`).

## Shared error type + guards

```ts
// lib/api-error.ts
export type ApiError = {
  status: number;
  message: string;
  errors: Record<string, string[]>;
};

export function isApiError(e: unknown): e is ApiError {
  return (
    typeof e === "object" && e !== null &&
    "status" in e && "message" in e
  );
}

export function getMessage(e: unknown): string {
  return isApiError(e) ? e.message : "Something went wrong.";
}

export async function buildApiError(res: Response): Promise<ApiError> {
  let body: any = {};
  try { body = await res.json(); } catch { /* non-JSON body */ }
  return {
    status: res.status,
    message: body.message ?? res.statusText,
    errors: body.errors ?? {},
  };
}
```

## Two clients, one contract

- `lib/api-client.ts` → `apiFetch` — **server-only**, attaches Bearer from the audience's Better Auth session (pass the `audience` arg; defaults to `client`). Used in Server Components and server actions. All GET reads and all mutations route through here (mutations via server actions).
- `lib/api-client-browser.ts` → `apiClientBrowser` — **combobox/autocomplete only** (the combobox section in `data-fetching.md`), consumed via **`useSWR`** (the `swrFetcher` wraps it). It calls internal route handlers under `/api/...` (never the backend directly); those handlers run `apiFetch` server-side. Do not use it for forms, edit-modal loads, or any other read/mutation. Both clients throw the same `ApiError` shape so error handling is identical on either side.
