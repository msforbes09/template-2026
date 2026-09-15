import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import { ForcePasswordChangeModal } from "@/modules/admin/components/force-password-change-modal";

export async function ForcePasswordChangeGate() {
  const profile = await getAdminProfile();
  if (!profile || profile.with_temporary_password !== 1) return null;
  return <ForcePasswordChangeModal />;
}
