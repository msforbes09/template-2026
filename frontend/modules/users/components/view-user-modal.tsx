"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CornerUpLeft, Eye, Loader2, LockOpen, Pin, UserCheck, UserCog, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ResourceModal } from "@/components/ui/resource-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format-number";
import { parseRemarks } from "@/modules/client-auth/lib/account-status";
import { isDaily, poolTone } from "@/modules/gateway-quota/lib/credits";
import { PlatformBadge } from "@/modules/gateway-logs/components/platform-badge";
import { RemarksHistory } from "@/modules/users/components/remarks-history";
import { ToggleAssessmentButton } from "@/modules/users/components/toggle-assessment-button";
import { claimState, isClaimedByOtherAdmin } from "@/modules/users/lib/assessment-claim";
import { canGrantDeveloper } from "@/modules/users/lib/developer-grant";
import { assessorName } from "@/modules/users/lib/assessor-name";
import { userStatusLabel } from "@/modules/users/lib/user-status-label";
import {
  approveUser,
  demoteUser,
  getUser,
  makeApprovedDeveloper,
  returnUser,
  suspendUser,
  unsuspendUser,
} from "@/modules/users/actions/user-actions";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import type { AdminUser } from "@/types/admin-user";

function formatFullAddress(user: AdminUser): string {
  const address = user.address;
  if (!address) return "—";
  const parts = [
    address.line_one,
    address.line_two,
    address.barangay?.name,
    address.municipality?.name,
    address.province?.name,
    address.region?.name,
    address.country?.name,
    address.postal_code,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

// A titled block of label/value pairs — the modal is sectioned rather than
// one long list, so an admin can jump to the question they came with.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-5">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

// The newest remark, surfaced as a callout up top so the reason greets the
// assessor before the details do. Toned by the remark's TAG rather than the
// account's status: a Returned note must survive the resubmission (status
// back to for_assessment) and a Suspended one any later transition — the
// history is exactly what the next assessor needs. Approval clears remarks
// server-side, so a clean account shows nothing.
const CALLOUT_TONE: Record<string, string> = {
  Suspended: "border-destructive/30 bg-destructive/5 text-destructive",
  Returned: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
};
// Untagged (or other-tagged, e.g. Demoted) history stays visible, just muted.
const CALLOUT_FALLBACK = "border-border bg-muted/40 text-foreground";

const NUMBER_TONE = {
  empty: "text-destructive",
  low: "text-amber-700 dark:text-amber-400",
  ok: "text-foreground",
} as const;

export function ViewUserModal({
  user: initialUser,
  canManageUsers = false,
  currentAdminId = null,
  triggerMode = "eye",
  nav,
}: {
  user: AdminUser;
  // Remarks are review-lane chatter: shown (callout + history) only to
  // admins who can act on the account. Fails closed like the column flags —
  // as do the action flags below: the lifecycle actions live HERE now (the
  // row keeps only navigations), so the modal is where the claim state and
  // permissions decide what an admin can do.
  canManageUsers?: boolean;
  currentAdminId?: number | null;
  // "claim-state" (users-manage rows) swaps the eye for one adaptive labeled
  // button: Start assessment CLAIMS (confirm + API) and then opens this
  // modal; Continue assessment / Started by another admin just open it.
  triggerMode?: "eye" | "claim-state";
  // The row's remaining buttons (top-up, logs, dashboard), rendered after
  // the eye in claim-state mode so the whole cell reads
  // [claim] | eye · nav around ONE modal instance.
  nav?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(initialUser);

  // The row already has every field except `citizenship` and `credits`
  // (show-only per the API) — seed the modal with it instantly and refresh in
  // the background instead of blocking behind a fresh fetch every time it's
  // opened.
  function refresh() {
    getUser(initialUser.uuid).then((result) => {
      if (result.ok) {
        setUser(result.data);
      } else if (result.status === 401) {
        setOpen(false);
        router.push("/admin/login");
      }
    });
  }

  const latestRemark = parseRemarks(user.assessment_remarks)[0];
  const calloutClass = latestRemark
    ? (CALLOUT_TONE[latestRemark.tag ?? ""] ?? CALLOUT_FALLBACK)
    : undefined;

  // Timestamps as the API's own Y-m-d H:i:s strings — exact, copy-pasteable
  // into the log viewers. Null rows vanish (last login says "Never" instead:
  // its absence is information, not noise).
  const timestamps: [string, string | null | undefined][] = [
    ["Registered", user.created_at],
    ["Profile completed", user.profile_completed_at],
    ["Last login", user.last_login_at ?? "Never"],
    ["Approved", user.approved_at],
    ["Suspended", user.suspended_at],
    ["Last updated", user.updated_at],
  ];

  const state = claimState(user, currentAdminId);

  const modal = (
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      onOpen={refresh}
      trigger={
        triggerMode === "eye" ? (
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label={`View ${user.display_name}`}>
                <Eye aria-hidden className="size-4" />
              </Button>
            }
          />
        ) : undefined
      }
      title="User details"
      contentClassName="sm:max-w-2xl"
      // Whoever this record is stays on screen (badges, contacts and all)
      // while the body scrolls, with the close pinned at the modal's corner.
      stickyHeader={
      <div className="flex items-center gap-3">
            {/* No size prop on purpose: size="lg" wins over a className
                override (its data-[size=lg]:size-10 rule is more specific), so
                the portrait could never grow past 2.5rem. Bare Avatar + size-20
                matches the three-line text block beside it. */}
            <Avatar className="size-20">
              {user.photo?.url && <AvatarImage src={user.photo.url} alt={user.display_name} />}
              <AvatarFallback aria-hidden className="text-2xl">
                {user.display_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{user.display_name}</p>
                {user.type === "developer" ? (
                  <Badge variant="secondary" className="bg-sky-500/10 text-sky-700 dark:text-sky-400">
                    Developer
                  </Badge>
                ) : (
                  <Badge variant="secondary">Basic</Badge>
                )}
                {user.status && (
                  <Badge
                    variant="secondary"
                    className={
                      user.status === "suspended" ? "bg-destructive/10 text-destructive" : undefined
                    }
                  >
                    {userStatusLabel(user.status)}
                  </Badge>
                )}
                {user.is_active === 0 && (
                  <Badge variant="secondary" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {[user.email, user.mobile_number].filter(Boolean).join(" · ") || "—"}
              </p>
              {user.company_name && (
                <p className="truncate text-sm text-muted-foreground/70">{user.company_name}</p>
              )}
            </div>
          </div>
      }
    >
      <div className="space-y-6">

        {/* The newest remark — red for a suspension, amber for a return,
            muted otherwise — and only to admins who can act. The full history
            stays at the bottom. */}
        {canManageUsers && calloutClass && latestRemark && (
          <div className={cn("rounded-lg border p-3 text-sm", calloutClass)}>
            <p className="font-medium">
              {latestRemark.tag}
              {latestRemark.date ? ` · ${latestRemark.date}` : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{latestRemark.body}</p>
          </div>
        )}

        {/* The assessment card, the project page's shape: acting on an
            account happens with the record — and the remarks — in view.
            Each action hands back the fresh user via onUpdated, so the
            modal (and which buttons show) updates in place: claim →
            review → decide is one visit. */}
        <UserActions
          user={user}
          canManageUsers={canManageUsers}
          currentAdminId={currentAdminId}
          onUpdated={setUser}
        />

        <Section title="Personal details">
          <Field label="Birth date">{user.birth_date ?? "—"}</Field>
          <Field label="Gender">{user.gender ?? "—"}</Field>
          <Field label="Citizenship">{user.citizenship?.name ?? "—"}</Field>
          <Field label="Authentication">
            {user.authentication_channel === "sms"
              ? "SMS"
              : user.authentication_channel === "email"
                ? "Email"
                : "—"}
          </Field>
          <Field label="Address" wide>
            {formatFullAddress(user)}
          </Field>
        </Section>

        {(user.is_assessment_started === 1 || user.approved_by != null) && (
          <Section title="Account details">
            {user.is_assessment_started === 1 && (
              <Field label="Assessing administrator">
                {assessorName(user.assessment_started_by) ?? "—"}
                {user.assessment_started_at ? (
                  <span className="text-muted-foreground"> · since {user.assessment_started_at}</span>
                ) : null}
              </Field>
            )}
            {user.approved_by != null && (
              <Field label="Approved by">{assessorName(user.approved_by) ?? "—"}</Field>
            )}
          </Section>
        )}

        <Section title="Timeline">
          {timestamps.map(([label, value]) =>
            value ? (
              <Field key={label} label={label}>
                <span className="tabular-nums">{value}</span>
              </Field>
            ) : null,
          )}
        </Section>

        {/* One line per pool — the numbers ARE the meter. Only on the show
            response, and only for approved developers (the API attaches pools
            to no one else). */}
        {!!user.credits?.length && (
          <section className="space-y-2 border-t border-border pt-5">
            <h3 className="text-sm font-semibold tracking-tight">API credits</h3>
            {/* One card per pool, three abreast (3x3 with the nine current
                catalogs): the badge row on top, the numbers beneath — at this
                width a single line would crowd. */}
            <ul className="grid gap-2 sm:grid-cols-3">
              {user.credits.map((pool) => (
                <li
                  key={pool.platform}
                  className="space-y-1 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PlatformBadge platform={pool.platform} />
                    {isDaily(pool) && (
                      <Badge variant="secondary" className="text-muted-foreground">
                        daily
                      </Badge>
                    )}
                  </div>
                  {/* Bottom-right, opposing the top-left badge — the diagonal
                      keeps the little cards from reading left-heavy, and the
                      right edge lines the numbers up column-wise. */}
                  <p className={cn("text-right tabular-nums", NUMBER_TONE[poolTone(pool)])}>
                    {formatNumber(pool.remaining)}
                    <span className="text-muted-foreground"> / {formatNumber(pool.allowance)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* The whole review history, manage-only like the callout: it tells
            an assessor a re-applying account was previously returned or
            sanctioned. */}
        {canManageUsers && user.assessment_remarks && (
          <div className="border-t border-border pt-5">
            <RemarksHistory remarks={user.assessment_remarks} />
          </div>
        )}

      </div>
    </ResourceModal>
  );

  if (triggerMode === "eye") {
    return (
      <Tooltip>
        {modal}
        <TooltipContent>View details</TooltipContent>
      </Tooltip>
    );
  }

  // claim-state: icon-only like the rest of the row, the label in the
  // tooltip. Start assessment claims first (its confirm + transfer dialogs
  // live in ToggleAssessmentButton) and opens on success; the filled Pin
  // states (yours primary-tinted, theirs muted) just open. The eye stays as
  // the plain show affordance, sharing this one modal.
  function openAndRefresh() {
    setOpen(true);
    refresh();
  }

  return (
    <>
      {state === "unclaimed" ? (
        <ToggleAssessmentButton
          uuid={user.uuid}
          started={false}
          name={user.display_name}
          iconOnly
          onUpdated={(fresh) => {
            setUser(fresh);
            if (fresh.is_assessment_started === 1) setOpen(true);
          }}
        />
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={
                  state === "mine"
                    ? `Continue assessing ${user.display_name}`
                    : `${user.display_name} is being assessed by another administrator`
                }
                onClick={openAndRefresh}
              >
                <Pin
                  aria-hidden
                  fill="currentColor"
                  className={cn(
                    "size-4",
                    state === "mine" ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </Button>
            }
          />
          <TooltipContent>
            {state === "mine" ? "Continue assessment" : "Started by another admin"}
          </TooltipContent>
        </Tooltip>
      )}
      {/* The pipe between the claim action and the read-only cluster —
          view first after it, then the navigations. */}
      <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`View ${user.display_name}`}
              onClick={openAndRefresh}
            >
              <Eye aria-hidden className="size-4" />
            </Button>
          }
        />
        <TooltipContent>View details</TooltipContent>
      </Tooltip>
      {nav}
      {modal}
    </>
  );
}

// The adaptive action set — the logic the row's actions cell used to hold.
// Confirmations render INSIDE this card (replacing its content) rather than
// as nested dialogs: no second modal layer exists, so dialogs can't stack,
// and while a confirmation is up the other actions are simply gone.
type ActionKey = "approve" | "return" | "make-developer" | "unsuspend" | "demote" | "suspend";

type ActionDescriptor = {
  label: string;
  icon: React.ReactNode;
  // The trigger's extra classes (the icon color language of the row).
  triggerClass?: string;
  // The confirm button's solid theme; empty string = the default primary.
  confirmClass: string;
  title: (name: string) => string;
  description: (name: string) => string;
  reason?: { required: boolean; label: string; placeholder: string; hint: string };
  run: (uuid: string, reason: string) => Promise<ActionResult<AdminUser>>;
  success: (name: string) => string;
};

const ACTIONS: Record<ActionKey, ActionDescriptor> = {
  approve: {
    label: "Approve",
    icon: <UserCheck aria-hidden className="size-3.5 text-emerald-600 dark:text-emerald-400" />,
    confirmClass: "bg-emerald-600 text-white hover:bg-emerald-700",
    title: (name) => `Approve ${name}?`,
    description: (name) =>
      `${name}'s account will be approved and they'll gain access to the API catalog.`,
    run: (uuid) => approveUser(uuid),
    success: (name) => `${name} approved`,
  },
  return: {
    label: "Return",
    icon: <CornerUpLeft aria-hidden className="size-3.5 text-amber-600 dark:text-amber-400" />,
    confirmClass: "bg-amber-600 text-white hover:bg-amber-700",
    title: (name) => `Return ${name}?`,
    description: (name) =>
      `Tell ${name} why their account wasn't approved. This is shown back to them.`,
    reason: {
      required: true,
      label: "Remarks",
      placeholder: "e.g. The uploaded photo is too blurry to verify. Please re-upload a clear one.",
      hint: "Shown to the account holder and kept in their history.",
    },
    run: (uuid, reason) => returnUser(uuid, reason),
    success: (name) => `${name} returned`,
  },
  "make-developer": {
    label: "Make developer",
    icon: <UserCog aria-hidden className="size-3.5" />,
    confirmClass: "",
    title: (name) => `Make ${name} a developer?`,
    description: () =>
      "They become an approved developer straight away — no application needed — and can mint API credentials and enter projects into the showcase. They're notified, and the access can be removed again later.",
    run: (uuid) => makeApprovedDeveloper(uuid),
    success: (name) => `${name} is now a developer`,
  },
  unsuspend: {
    label: "Lift suspension",
    icon: <LockOpen aria-hidden className="size-3.5" />,
    confirmClass: "",
    title: (name) => `Lift the suspension on ${name}?`,
    description: () =>
      "They can post and manage their projects again. The account stays basic — if they were a developer before, they'll need to apply again.",
    run: (uuid) => unsuspendUser(uuid),
    success: () => "Suspension lifted",
  },
  demote: {
    label: "Remove developer access",
    icon: <UserMinus aria-hidden className="size-3.5" />,
    triggerClass: "text-destructive",
    confirmClass: "bg-destructive text-white hover:bg-destructive/90",
    title: (name) => `Remove ${name}'s developer access?`,
    description: () =>
      "They go back to a basic account and their gateway credentials are revoked. Their existing projects stay, and they can still manage and review them.",
    reason: {
      required: false,
      label: "Reason (optional)",
      placeholder: "e.g. Credentials unused for a year.",
      hint: "Kept in the account's history.",
    },
    run: (uuid, reason) => demoteUser(uuid, reason),
    success: (name) => `${name} is now a basic account`,
  },
  suspend: {
    label: "Suspend",
    icon: <Ban aria-hidden className="size-3.5" />,
    triggerClass: "text-destructive",
    confirmClass: "bg-destructive text-white hover:bg-destructive/90",
    title: (name) => `Suspend ${name}?`,
    description: () =>
      "The account is frozen read-only: they can still sign in and read their data, but not post, edit or manage projects. A developer is demoted and their gateway credentials are revoked.",
    reason: {
      required: true,
      label: "Reason",
      placeholder: "Repeated abuse reports from other participants.",
      hint: "Sent to the account holder and kept in their history.",
    },
    run: (uuid, reason) => suspendUser(uuid, reason),
    success: (name) => `${name} suspended`,
  },
};

function UserActions({
  user,
  canManageUsers,
  currentAdminId,
  onUpdated,
}: {
  user: AdminUser;
  canManageUsers: boolean;
  currentAdminId: number | null;
  onUpdated: (user: AdminUser) => void;
}) {
  const router = useRouter();
  // The action being confirmed; non-null swaps the card's content for its
  // confirmation panel.
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isForAssessment = user.status === "for_assessment";
  const isStarted = user.is_assessment_started === 1;
  const isSuspended = user.status === "suspended";
  const claimedByOther = isClaimedByOtherAdmin(user, currentAdminId);

  const showLifecycle = canManageUsers && !claimedByOther;
  if (!canManageUsers) return null;

  function openPanel(key: ActionKey) {
    setPending(key);
    setReason("");
    setError(null);
  }

  function cancel() {
    setPending(null);
    setReason("");
    setError(null);
  }

  function confirm(key: ActionKey) {
    const action = ACTIONS[key];
    if (action.reason?.required && !reason.trim()) {
      setError(`${action.reason.label} is required.`);
      return;
    }
    startTransition(async () => {
      const result = await action.run(user.uuid, reason.trim());
      if (result.ok) {
        onUpdated(result.data);
        cancel();
        router.refresh();
        toast.success(action.success(user.display_name));
        return;
      }
      setError(result.message);
    });
  }

  // Which actions the current state offers, in display order — destructive
  // pair last, so reaching for them is deliberate.
  const offered: ActionKey[] = [];
  if (showLifecycle && isStarted) {
    if (isForAssessment) offered.push("approve", "return");
    if (canGrantDeveloper(user)) offered.push("make-developer");
    if (isSuspended) offered.push("unsuspend");
    if (user.type === "developer" && !isSuspended) offered.push("demote");
    if (!isSuspended) offered.push("suspend");
  }

  const active = pending ? ACTIONS[pending] : null;

  return (
    <section className="space-y-3 rounded-xl border border-border p-4">
      {active ? (
        /* The confirmation, in place of the card's normal content — one
           uniform anatomy for every action: question, description, reason
           where the action takes one, Cancel + themed confirm. */
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              {active.title(user.display_name)}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {active.description(user.display_name)}
            </p>
          </div>
          {active.reason && (
            <div className="space-y-1.5">
              <label htmlFor="user-action-reason" className="text-sm font-medium">
                {active.reason.label}
                {active.reason.required && (
                  <span aria-hidden className="ml-0.5 text-destructive">
                    *
                  </span>
                )}
              </label>
              <Textarea
                id="user-action-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={active.reason.placeholder}
                autoFocus
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{active.reason.hint}</p>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={cancel} disabled={isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={active.confirmClass || undefined}
              disabled={isPending}
              onClick={() => pending && confirm(pending)}
            >
              {isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {active.label}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Assessment</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {claimedByOther
                  ? `Being assessed by ${assessorName(user.assessment_started_by) ?? "another administrator"}${
                      user.assessment_started_at ? ` since ${user.assessment_started_at}` : ""
                    }.`
                  : isStarted
                    ? "You hold this assessment — decide, or release it."
                    : "Claim this account to act on it."}
              </p>
            </div>
            {showLifecycle && (
              <ToggleAssessmentButton
                uuid={user.uuid}
                started={isStarted}
                name={user.display_name}
                onUpdated={onUpdated}
              />
            )}
          </div>
          {offered.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {offered.map((key) => {
                const action = ACTIONS[key];
                return (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    className={cn("gap-1.5", action.triggerClass)}
                    onClick={() => openPanel(key)}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
