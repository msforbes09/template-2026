// Browser-side fetch for the one client-GET exception (async picker/combobox
// → internal route handler, never the backend directly — see api-client.ts
// for the server-only client that holds the actual Bearer token).
async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body: { message?: string } = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? res.statusText), { status: res.status });
  }
  return res.json();
}

export const apiClientBrowser = { get };
