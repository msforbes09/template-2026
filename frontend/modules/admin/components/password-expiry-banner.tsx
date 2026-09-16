import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import { PasswordExpiryNotice } from "@/modules/admin/components/password-expiry-notice";

// Renders the expiry notice only in its soft state (expired with postponements
// left). The hard state is the forced modal, mounted by the dashboard layout.
export async function PasswordExpiryBanner() {
  const profile = await getAdminProfile();
  const remaining = profile?.password_expiry_waives_remaining ?? 0;
  if (!profile?.password_expires_at || profile.is_password_expired !== 1 || remaining === 0) {
    return null;
  }
  return <PasswordExpiryNotice expiresAt={profile.password_expires_at} waivesRemaining={remaining} />;
}
