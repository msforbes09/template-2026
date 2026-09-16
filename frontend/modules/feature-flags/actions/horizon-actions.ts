"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";

type HorizonAccess = { url: string; expires_at: string };

// POST administrator/horizon/access, then send the browser to the signed link
// it returns. The link lands on the Horizon host, authorises that browser
// session for the dashboard and redirects into it — so this is a form action,
// not a fetch-then-window.open, which popup blockers would swallow.
//
// Gated on `developer-access` server-side; the button is only rendered after
// the System Controls fetch succeeded, but as an exported server action this is
// still a public endpoint, so requireAdminSession plus the backend's 403 are
// what enforce it (security.md rule 16).
//
// A failure throws so the route's error boundary reports it; there is no
// in-page state to attach a toast to on a plain form submission.
export async function openHorizon(): Promise<void> {
  await requireAdminSession();

  let url: string;
  try {
    const { data } = await apiFetch<{ data: HorizonAccess }>(
      "/horizon/access",
      { method: "POST" },
      "admin",
    );
    url = data.url;
  } catch (err) {
    const reason =
      isApiError(err) && !(err.status >= 500 && env.NODE_ENV === "production")
        ? err.message
        : "Something went wrong.";
    void logError(err, { where: "openHorizon action", audience: "admin" });
    throw new Error(`Couldn't open Horizon: ${reason}`);
  }

  redirect(url);
}
