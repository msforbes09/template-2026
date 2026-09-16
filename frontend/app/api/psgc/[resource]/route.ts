import { NextResponse, type NextRequest } from "next/server";
import { apiFetch } from "@/lib/api-client";
import { getClientSession } from "@/lib/auth/dal";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import type { PsgcOption } from "@/types/psgc";
import { safeErrorMessage } from "@/lib/safe-error-message";

// Backs modules/client-auth/components/psgc-combobox.tsx — the registration
// wizard's region/province/municipality/barangay/citizenship pickers. One
// parameterized route for all 5 Common API lookups (same shape: search +
// parent-code filters + pagination) rather than 5 near-identical handlers.
const ALLOWED_RESOURCES = ["regions", "provinces", "municipalities", "barangays", "countries"] as const;
type Resource = (typeof ALLOWED_RESOURCES)[number];

const FORWARDED_PARAMS = ["search", "code", "region_code", "province_code", "municipality_code"];

function isAllowedResource(value: string): value is Resource {
  return (ALLOWED_RESOURCES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!isAllowedResource(resource)) {
    return NextResponse.json({ message: "Unknown resource." }, { status: 400 });
  }

  // getClientSession, NOT requireClientSession — this is a JSON API endpoint
  // consumed by fetch(), not a browser navigation; requireClientSession()'s
  // redirect() would be wrong here (route handlers return 401 instead).
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const query = new URLSearchParams();
  for (const key of FORWARDED_PARAMS) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) query.set(key, value);
  }
  query.set("per_page", "100");

  try {
    const data = await apiFetch<{ data: PsgcOption[] }>(
      `/${resource}?${query.toString()}`,
      undefined,
      "client",
      "/common",
    );
    return NextResponse.json(data);
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ message: safeErrorMessage(err) }, { status: err.status });
    }
    await logError(err, { where: `GET /api/psgc/${resource}`, audience: "client" });
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
