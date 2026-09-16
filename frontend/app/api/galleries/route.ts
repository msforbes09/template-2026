import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api-client";
import { getAdminSession } from "@/lib/auth/dal";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import type { GalleryImage } from "@/types/gallery";
import { safeErrorMessage } from "@/lib/safe-error-message";

// Backs the gallery image picker (modules/gallery/components/gallery-image-picker-dialog.tsx),
// the one client-side GET in the app — proxied here so the Bearer token
// never reaches client JS.
export async function GET() {
  // getAdminSession, NOT requireAdminSession — this is a JSON API endpoint
  // consumed by fetch(), not a browser navigation; requireAdminSession()'s
  // redirect() would be wrong here (route handlers return 401 instead).
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  try {
    const data = await apiFetch<{ data: GalleryImage[] }>("/galleries", undefined, "admin");
    return NextResponse.json(data);
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ message: safeErrorMessage(err) }, { status: err.status });
    }
    await logError(err, { where: "GET /api/galleries", audience: "admin" });
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
