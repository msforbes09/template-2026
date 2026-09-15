import { NextRequest, NextResponse } from "next/server";
import { handleBroadcastingAuth } from "@/lib/broadcasting-auth";

// Channel auth for a citizen's own Reverb socket (`private-user.{uuid}`,
// ownership-gated server-side). See lib/broadcasting-auth.ts.
export function POST(req: NextRequest): Promise<NextResponse> {
  return handleBroadcastingAuth(req, "client");
}
