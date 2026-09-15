import { NextRequest, NextResponse } from "next/server";
import { handleBroadcastingAuth } from "@/lib/broadcasting-auth";

// Channel auth for the admin console's Reverb socket (the shared
// `private-administrators` feed). See lib/broadcasting-auth.ts.
export function POST(req: NextRequest): Promise<NextResponse> {
  return handleBroadcastingAuth(req, "admin");
}
