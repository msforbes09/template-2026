"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  getPermissionGroups,
  getRole,
  syncRolePermissions,
} from "@/modules/access-control/actions/role-actions";
import type { PermissionGroup } from "@/types/access-control";

// One Permissions button for both audiences: with roles-manage it is the
// editor (checkboxes + save); readOnly it answers "what does this role
// grant?" with held/not-held icons and no save — nothing looks operable.
// Both loads (the role show and the permission groups) sit behind roles-view
// on the WS, so the read-only mode works for exactly the admins it exists for.
export function SyncPermissionsModal({
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
  const [groups, setGroups] = useState<PermissionGroup[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [isSaving, setSaving] = useState(false);

  function load() {
    setGroups(null);
    setError(null);
    setSelected(new Set());
    startTransition(async () => {
      // The list endpoint doesn't return each role's permissions (confirmed
      // against the live API — only the show endpoint does), so the modal
      // fetches the role fresh here rather than trusting a prop derived from
      // list-row data.
      const [groupsResult, roleResult] = await Promise.all([getPermissionGroups(), getRole(id)]);

      if (!groupsResult.ok) {
        if (groupsResult.status === 401) {
          setOpen(false);
          router.push("/admin/login");
          return;
        }
        setError(groupsResult.message);
        return;
      }
      if (!roleResult.ok) {
        if (roleResult.status === 401) {
          setOpen(false);
          router.push("/admin/login");
          return;
        }
        setError(roleResult.message);
        return;
      }

      setSelected(new Set(roleResult.data.permissions.map((permission) => permission.id)));
      setGroups(groupsResult.data);
    });
  }

  function toggle(permissionId: number, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(permissionId);
      } else {
        next.delete(permissionId);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const result = await syncRolePermissions(id, Array.from(selected));
    setSaving(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
      toast.success("Permissions updated");
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
          aria-label={`${readOnly ? "View" : "Manage"} ${name}'s permissions`}
        >
          <ShieldCheck aria-hidden className="size-4" />
        </Button>
      }
      title={readOnly ? "Role permissions" : "Manage permissions"}
      description={readOnly ? `What ${name} grants.` : `Choose which permissions ${name} grants.`}
    >
      {error ? (
        <EmptyState
          title="Couldn't load permissions"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : groups ? (
        groups.length === 0 ? (
          <EmptyState
            title="No permissions defined"
            description="Permissions are configured on the backend."
          />
        ) : (
          <div className="space-y-4">
            <div className="max-h-96 space-y-5 overflow-y-auto pr-1">
              {groups.map((group) => (
                <div key={group.id}>
                  <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                  <div className="mt-2 space-y-2">
                    {group.permissions.map((permission) => {
                      if (readOnly) {
                        const has = selected.has(permission.id);
                        return (
                          <div
                            key={permission.id}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg border border-border px-3 py-2",
                              !has && "opacity-50",
                            )}
                          >
                            {has ? (
                              <Check
                                aria-hidden
                                className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                              />
                            ) : (
                              <Minus aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="flex-1 font-mono text-sm">{permission.name}</span>
                            <span className="sr-only">{has ? "granted" : "not granted"}</span>
                          </div>
                        );
                      }
                      const checkboxId = `${instanceId}-perm-${permission.id}`;
                      return (
                        <div
                          key={permission.id}
                          className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2"
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={selected.has(permission.id)}
                            onCheckedChange={(checked) => toggle(permission.id, checked === true)}
                          />
                          <label htmlFor={checkboxId} className="flex-1 font-mono text-sm">
                            {permission.name}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {!readOnly && (
              <Button className="w-full" disabled={isSaving} onClick={handleSave}>
                Save permissions
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
