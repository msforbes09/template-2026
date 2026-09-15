"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  getAdministrator,
  getRolesForPicker,
  syncAdministratorRoles,
} from "@/modules/administrators/actions/administrator-actions";
import type { Role } from "@/types/access-control";

// One Roles button for both audiences — the SyncPermissionsModal pattern:
// with administrators-manage it is the editor (checkboxes + save); readOnly it
// answers "which roles does this administrator hold?" with held/not-held
// icons and no save. Both loads pass for a view-only admin — the admin show
// sits behind administrators-view (and log.pii-access: opening this viewer is
// an audited read, by design), the roles picker behind either view permission.
export function SyncRolesModal({
  id,
  name,
  readOnly = false,
}: {
  id: number;
  name: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const instanceId = useId();
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [isSaving, setSaving] = useState(false);

  function load() {
    setRoles(null);
    setError(null);
    setSelected(new Set());
    startTransition(async () => {
      // The administrators list endpoint doesn't reliably return each
      // admin's roles (confirmed against the live API — see the
      // normalization in administrators-list.tsx), so this fetches the
      // administrator fresh here rather than trusting a prop derived from
      // list-row data.
      const [rolesResult, adminResult] = await Promise.all([
        getRolesForPicker(),
        getAdministrator(id),
      ]);

      if (!rolesResult.ok) {
        if (rolesResult.status === 401) {
          setOpen(false);
          router.push("/admin/login");
          return;
        }
        setError(rolesResult.message);
        return;
      }
      if (!adminResult.ok) {
        if (adminResult.status === 401) {
          setOpen(false);
          router.push("/admin/login");
          return;
        }
        setError(adminResult.message);
        return;
      }

      setSelected(new Set(adminResult.data.roles.map((role) => role.id)));
      setRoles(rolesResult.data);
    });
  }

  function toggle(roleId: number, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(roleId);
      } else {
        next.delete(roleId);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const result = await syncAdministratorRoles(id, Array.from(selected));
    setSaving(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
      toast.success("Roles updated");
    } else {
      toast.error(result.message);
    }
  }

  return (
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      onOpen={load}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${readOnly ? "View" : "Manage"} ${name}'s roles`}
        >
          <Shield aria-hidden className="size-4" />
        </Button>
      }
      title={readOnly ? "Roles" : "Manage roles"}
      description={readOnly ? `Which roles ${name} holds.` : `Choose which roles ${name} has.`}
    >
      {error ? (
        <EmptyState
          title="Couldn't load roles"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : roles ? (
        roles.length === 0 ? (
          <EmptyState title="No roles yet" description="Create a role first to assign it." />
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {roles.map((role) => {
                if (readOnly) {
                  const has = selected.has(role.id);
                  return (
                    <div
                      key={role.id}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5",
                        !has && "opacity-50",
                      )}
                    >
                      {has ? (
                        <Check
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        />
                      ) : (
                        <Minus aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex-1 text-sm">
                        <span className="font-medium">{role.name}</span>
                        {role.description && (
                          <span className="block text-muted-foreground">{role.description}</span>
                        )}
                        <span className="sr-only">{has ? "held" : "not held"}</span>
                      </span>
                    </div>
                  );
                }
                const checkboxId = `${instanceId}-role-${role.id}`;
                return (
                  <div
                    key={role.id}
                    className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={selected.has(role.id)}
                      onCheckedChange={(checked) => toggle(role.id, checked === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor={checkboxId} className="flex-1 text-sm">
                      <span className="font-medium">{role.name}</span>
                      {role.description && (
                        <span className="block text-muted-foreground">{role.description}</span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
            {!readOnly && (
              <Button className="w-full" disabled={isSaving} onClick={handleSave}>
                Save roles
              </Button>
            )}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}
    </ResourceModal>
  );
}
