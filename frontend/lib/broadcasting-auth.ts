import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api-client";
import { getAdminSession, getClientSession } from "@/lib/auth/dal";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { safeErrorMessage } from "@/lib/safe-error-message";

// Laravel Reverb's channel-authorization endpoint, proxied through our own
// server — shared by both audiences' route handlers.
//
// lib/echo-client.ts's custom `authorizer` POSTs here (instead of letting
// pusher-js POST directly to Laravel) specifically so this hop can attach the
// audience's Bearer token server-side — the token is never exposed to client
// JS (see lib/auth/dal.ts / lib/api-client.ts).
//
// The two audiences hit genuinely different backend endpoints with different
// guards — /administrator/broadcasting/auth (admins, permission-gated on the
// shared `administrators` channel) vs /user/broadcasting/auth (citizens,
// ownership-gated on their own `user.{uuid}`). Presenting the wrong one is a
// 403 on subscribe, so the audience is fixed by which route file called this,
// never taken from the request.
export async function handleBroadcastingAuth(
  req: NextRequest,
  audience: "admin" | "client",
): Promise<NextResponse> {
  // getAdminSession/getClientSession, NOT the require* variants — this is a
  // JSON API endpoint consumed by fetch(), not a browser navigation; a
  // redirect() would be wrong here (route handlers return 401 instead).
  const session = audience === "admin" ? await getAdminSession() : await getClientSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  let body: { socket_id?: unknown; channel_name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 422 });
  }

  const { socket_id, channel_name } = body;
  if (typeof socket_id !== "string" || typeof channel_name !== "string") {
    return NextResponse.json(
      { message: "socket_id and channel_name are required." },
      { status: 422 },
    );
  }

  try {
    const data = await apiFetch<{ auth: string; channel_data?: string }>(
      "/broadcasting/auth",
      { method: "POST", body: JSON.stringify({ socket_id, channel_name }) },
      audience,
    );
    return NextResponse.json(data);
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ message: safeErrorMessage(err) }, { status: err.status });
    }
    await logError(err, { where: `POST /api/broadcasting/${audience}/auth`, audience });
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
