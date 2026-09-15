import { DEVICE_TOKEN_COOKIE } from "@/lib/auth/cookie-names";

// Trusted-device token only — the real session is written server-side by
// modules/admin/actions/session-actions.ts via Better Auth. This one is a
// Laravel-specific marker sent back on future /authenticate calls to skip
// 2FA within a trust window, so it stays a plain client cookie.
const isBrowser = typeof document !== "undefined";

export function setAdminDeviceToken(token: string) {
  if (!isBrowser) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${DEVICE_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${
    60 * 60 * 24 * 90
  }; SameSite=Lax${secure}`;
}

export function getAdminDeviceToken(): string | undefined {
  if (!isBrowser) return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${DEVICE_TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
