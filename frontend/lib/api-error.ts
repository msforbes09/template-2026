export type ApiError = Error & {
  status: number;
  message: string;
  errors: Record<string, string[]>;
  code?: string;
  meta?: Record<string, unknown>;
};

export function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "status" in e && "message" in e;
}

export function getMessage(e: unknown): string {
  return isApiError(e) ? e.message : "Something went wrong.";
}

// Thrown from apiFetch on any non-2xx response. Built on a real Error
// instance (not a plain object literal) — Next's Suspense/error-boundary
// streaming machinery expects thrown errors to be actual Errors for digest
// generation and client-side forwarding; a plain-object throw left an
// uncaught rejection inside a Suspense boundary hung on its skeleton forever
// instead of resolving to error.tsx (verified directly against this
// installed Next.js version).
export async function buildApiError(res: Response): Promise<ApiError> {
  let body: {
    message?: string;
    errors?: Record<string, string[]>;
    error?: string;
    meta?: Record<string, unknown>;
  } = {};
  try {
    body = await res.json();
  } catch {
    // non-JSON body
  }
  const message = body.message ?? res.statusText;
  return Object.assign(new Error(message), {
    status: res.status,
    message,
    errors: body.errors ?? {},
    code: body.error,
    meta: body.meta,
  });
}
