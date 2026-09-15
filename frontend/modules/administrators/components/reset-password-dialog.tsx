"use client";

import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resetAdministratorPassword } from "@/modules/administrators/actions/administrator-actions";

export function ResetPasswordDialog({ id, name }: { id: number; name: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Reset ${name}'s password`}>
          <KeyRound aria-hidden className="size-4" />
        </Button>
      }
      title="Reset password?"
      description={`A new temporary password will be generated and emailed to ${name}. Their current password stops working immediately.`}
      confirmLabel="Reset password"
      onConfirm={async () => {
        const result = await resetAdministratorPassword(id);
        if (result.ok) {
          router.refresh();
          toast.success("Temporary password sent");
        } else {
          toast.error(result.message);
        }
      }}
    />
  );
}
