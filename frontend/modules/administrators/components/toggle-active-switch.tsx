"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { toggleAdministratorStatus } from "@/modules/administrators/actions/administrator-actions";

export function ToggleActiveSwitch({
  id,
  active,
  name,
}: {
  id: number;
  active: boolean;
  name: string;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(active);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      const result = await toggleAdministratorStatus(id);
      if (result.ok) {
        setChecked(result.data.is_active === 1);
        router.refresh();
        toast.success(result.data.is_active === 1 ? `${name} activated` : `${name} deactivated`);
      } else {
        setChecked(!next);
        toast.error(result.message);
      }
    });
  }

  return (
    <Switch
      checked={checked}
      disabled={isPending}
      onCheckedChange={handleChange}
      aria-label={checked ? `Deactivate ${name}` : `Activate ${name}`}
    />
  );
}
