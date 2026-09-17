import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import { passwordGateReason } from "@/modules/admin/lib/password-gate";
import { ForcePasswordChangeModal } from "@/modules/admin/components/force-password-change-modal";

export async function ForcePasswordChangeGate() {
  const reason = passwordGateReason(await getAdminProfile());
  if (!reason) return null;
  return <ForcePasswordChangeModal reason={reason} />;
}
