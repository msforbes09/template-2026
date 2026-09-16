import type { Administrator } from "@/types/administrator";

export type PasswordGateReason = "temporary" | "expired";

// Why the console must block the administrator behind a forced password
// change, or null when it must not. Mirrors the backend's `password.changed`
// middleware (EnsurePasswordChanged): a temporary password always blocks; an
// expired password blocks only once every postponement has been used. The
// temporary case wins when both apply because it is the one the backend
// reports first and its copy ("you're signing in with a temporary password")
// is the more useful of the two.
export function passwordGateReason(profile: Administrator | null): PasswordGateReason | null {
  if (!profile) return null;
  if (profile.with_temporary_password === 1) return "temporary";
  if (profile.is_password_expired === 1 && profile.password_expiry_waives_remaining === 0) {
    return "expired";
  }
  return null;
}
