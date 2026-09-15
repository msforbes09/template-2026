"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdminUser } from "@/types/admin-user";
import { Input } from "@/components/ui/input";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format-number";
import { PlatformBadge } from "@/modules/gateway-logs/components/platform-badge";
import { findPool, isDaily, poolTone } from "@/modules/gateway-quota/lib/credits";
import { bumpGatewayQuota, getUser } from "@/modules/users/actions/user-actions";
import {
  gatewayQuotaSchema,
  type GatewayQuotaFormValues,
  type GatewayQuotaValues,
} from "@/modules/users/schemas/gateway-quota-schema";
import type { GatewayCredits } from "@/types/gateway-log";

const FIELDS = ["platform", "amount"] as const;
const QUICK_AMOUNTS = [100, 200, 300, 500, 1000, 2000] as const;

// Same tone map as the details modal's credit cards — the two screens should
// read identically.
const NUMBER_TONE = {
  empty: "text-destructive",
  low: "text-amber-700 dark:text-amber-400",
  ok: "text-foreground",
} as const;

// One selectable-card treatment for both choice rows.
function cardClass(selected: boolean) {
  return cn(
    "rounded-lg border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
  );
}

export function TopUpQuotaModal({
  uuid,
  name,
  onUpdated,
}: {
  uuid: string;
  name: string;
  // Hands the fresh record back to the details modal hosting this action.
  onUpdated?: (user: AdminUser) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // The users list doesn't carry credits (the API only embeds them on the
  // show), so the current pools are fetched when the modal opens. They are
  // also what draws the pool cards — the pool list IS the partner list, one
  // entry per configured catalog, so no second request and no hardcoded slug
  // table that could drift from the backend's config.
  const [credits, setCredits] = useState<GatewayCredits | null>(null);
  // Preset cards by default; the manual input appears only when asked for.
  const [customAmount, setCustomAmount] = useState(false);

  const form = useForm<GatewayQuotaFormValues, unknown, GatewayQuotaValues>({
    resolver: zodResolver(gatewayQuotaSchema),
    defaultValues: { platform: "", amount: "100" },
  });

  // useWatch, not form.watch(): watch() returns a fresh function the React
  // Compiler can't memoize, which makes it skip optimizing this component
  // (the warning the other RHF forms in this repo carry).
  const selectedPlatform = useWatch({ control: form.control, name: "platform" });
  const amountValue = useWatch({ control: form.control, name: "amount" });
  const selectedPool = findPool(credits ?? undefined, selectedPlatform);
  // Until a pool is picked the wording has to stay neutral — "add" would be
  // wrong for a daily pool and "set" wrong for a lifetime one.
  const daily = selectedPool ? isDaily(selectedPool) : false;

  function loadCredits() {
    setCredits(null);
    setCustomAmount(false);
    form.reset({ platform: "", amount: "100" });
    getUser(uuid).then((result) => {
      if (result.ok) {
        const pools = result.data.credits ?? [];
        setCredits(pools);
        // Preselect when there is no choice to make.
        if (pools.length === 1) {
          form.setValue("platform", pools[0].platform, { shouldValidate: false });
        }
      } else if (result.status === 401) {
        setOpen(false);
        router.push("/admin/login");
      }
    });
  }

  async function handleSubmit(values: GatewayQuotaValues) {
    const result = await bumpGatewayQuota(uuid, values.platform, values.amount);
    if (result.ok) {
      onUpdated?.(result.data);
      setOpen(false);
      // revalidateTag alone doesn't refresh an already-mounted list.
      router.refresh();
      const updated = findPool(result.data.credits, values.platform);
      toast.success(
        updated
          ? `${values.platform}: ${formatNumber(updated.remaining)} of ${formatNumber(
              updated.allowance,
            )} credits left`
          : `Updated ${values.platform} credits for ${name}`,
      );
      return;
    }

    // The daily pools reject a lowered allowance with a domain error carrying
    // the current value — worth saying outright, since the admin's next move
    // is simply to enter a higher number.
    if (result.status === 400 && result.code === "allowance_cannot_be_lowered") {
      const current = result.meta?.allowance;
      setCustomAmount(true);
      form.setError("amount", {
        message:
          typeof current === "number"
            ? `${values.platform}'s daily allowance is already ${formatNumber(current)}. Enter that or higher — a daily allowance can't be lowered.`
            : "A daily allowance can't be lowered. Enter the current allowance or higher.",
      });
      return;
    }

    applyResultErrors(form, result, FIELDS);
  }

  return (
    <Tooltip>
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      onOpen={loadCredits}
      trigger={
        <TooltipTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Top up ${name}'s API credits`}>
              <Coins aria-hidden className="size-4" />
            </Button>
          }
        />
      }
      title="Top up API credits"
      description={`Each eGov API has its own allowance. Pick the one to top up for ${name}.`}
      contentClassName="sm:max-w-2xl"
    >
      <FormProvider {...form}>
        <form
          onSubmit={(event) => {
            void form.handleSubmit(handleSubmit)(event);
          }}
          className="space-y-5"
          noValidate
        >
          {/* Every pool as a selectable card — the details modal's credit
              grid, made clickable: choosing an API and seeing its balance is
              one act, not a dropdown plus a preview. */}
          {credits === null ? (
            <div aria-hidden className="grid gap-2 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
                />
              ))}
            </div>
          ) : credits.length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
              This account has no API allowances — only an approved developer has them.
            </p>
          ) : (
            <Controller
              control={form.control}
              name="platform"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="API">
                    {(credits ?? []).map((pool) => {
                      const selected = field.value === pool.platform;
                      return (
                        <button
                          key={pool.platform}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => field.onChange(pool.platform)}
                          className={cn("w-full space-y-1 px-3 py-2 text-left", cardClass(selected))}
                        >
                          <span className="flex flex-wrap items-center gap-1.5">
                            <PlatformBadge platform={pool.platform} />
                            {isDaily(pool) && (
                              <Badge variant="secondary" className="text-muted-foreground">
                                daily
                              </Badge>
                            )}
                          </span>
                          <span
                            className={cn(
                              "block text-right tabular-nums",
                              NUMBER_TONE[poolTone(pool)],
                            )}
                          >
                            {formatNumber(pool.remaining)}
                            <span className="text-muted-foreground">
                              {" "}
                              / {formatNumber(pool.allowance)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {form.formState.errors.platform?.message && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.platform.message}
                    </p>
                  )}
                </div>
              )}
            />
          )}

          {/* The amount as preset cards, the manual input behind Custom —
              most top-ups are one of these three. */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {daily ? "New daily allowance" : "Credits to add"}
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Amount">
              {QUICK_AMOUNTS.map((amount) => {
                const selected = !customAmount && amountValue === String(amount);
                return (
                  <button
                    key={amount}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setCustomAmount(false);
                      form.setValue("amount", String(amount), { shouldValidate: true });
                    }}
                    className={cn("px-4 py-2 tabular-nums", cardClass(selected))}
                  >
                    {daily ? formatNumber(amount) : `+${formatNumber(amount)}`}
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={customAmount}
                onClick={() => setCustomAmount(true)}
                className={cn("px-4 py-2", cardClass(customAmount))}
              >
                Custom…
              </button>
            </div>
            {customAmount ? (
              <AppFormField
                // The same number means different things per period, so the
                // hint says which — "Add 500" to a daily pool would read as a
                // top-up and silently SET the allowance to 500 instead.
                label={daily ? "New daily allowance" : "Credits to add"}
                isRequired
                userInfo={
                  daily
                    ? "A multiple of 100. This SETS the daily allowance, which resets each midnight — it can't be lowered."
                    : "A positive multiple of 100, added to the current allowance. Allowances can only go up."
                }
                error={form.formState.errors.amount?.message}
              >
                <Input inputMode="numeric" placeholder="100" autoFocus {...form.register("amount")} />
              </AppFormField>
            ) : (
              form.formState.errors.amount?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )
            )}
          </div>

          <FormRootError />
          <FormSubmitButton className="w-full">
            {daily ? "Set daily allowance" : "Add credits"}
          </FormSubmitButton>
        </form>
      </FormProvider>
    </ResourceModal>
    <TooltipContent>Top up API credits</TooltipContent>
    </Tooltip>
  );
}
