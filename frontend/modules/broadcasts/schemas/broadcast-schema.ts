import { z } from "zod";
import type { AccountStatus } from "@/modules/client-auth/lib/account";
import type { BroadcastFilters } from "@/types/broadcast";

// The compose form.
//
// Targeting is modelled as a MODE plus its fields, not as three independent
// optional inputs. The API forbids `user_uuid` alongside `type`/`status` and
// answers 422 when both arrive; making the mode the thing the admin picks
// means that combination cannot be expressed, so the error never happens.

export const TITLE_MAX = 150;
export const BODY_MAX = 1000;

export const BROADCAST_AUDIENCES = ["everyone", "segment", "user"] as const;
export type BroadcastAudienceMode = (typeof BROADCAST_AUDIENCES)[number];

export const ACCOUNT_TYPE_OPTIONS = [
  { value: "basic", label: "Basic accounts" },
  { value: "developer", label: "Developer accounts" },
] as const;

// Same list and wording the users console uses, so a segment means here what
// it means there.
export const ACCOUNT_STATUS_OPTIONS: { value: AccountStatus; label: string }[] = [
  { value: "draft", label: "Draft — profile incomplete" },
  { value: "completed", label: "Completed profile" },
  { value: "for_assessment", label: "Under review" },
  { value: "for_resubmission", label: "Needs changes" },
  { value: "approved", label: "Approved developer" },
  { value: "suspended", label: "Suspended" },
  { value: "pending", label: "Pending (dormant SSO)" },
];

export const broadcastSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters`),
    body: z
      .string()
      .trim()
      .min(1, "Message is required")
      .max(BODY_MAX, `Keep the message under ${BODY_MAX} characters`),
    audience: z.enum(BROADCAST_AUDIENCES),
    // Only read when audience === "segment"; "" means "not narrowed by this".
    type: z.string(),
    status: z.string(),
    // Only read when audience === "user".
    user_uuid: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.audience === "user" && !values.user_uuid.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Choose the citizen to notify",
        path: ["user_uuid"],
      });
    }

    // A "segment" with nothing selected is the Everyone audience wearing a
    // disguise — and Everyone is the one that requires a typed confirmation.
    // Refusing it here stops that guard being bypassed by accident.
    if (values.audience === "segment" && !values.type.trim() && !values.status.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Choose an account type or a status, or send to everyone instead",
        path: ["type"],
      });
    }
  });

export type BroadcastValues = z.infer<typeof broadcastSchema>;

export const EMPTY_BROADCAST_VALUES: BroadcastValues = {
  title: "",
  body: "",
  audience: "everyone",
  type: "",
  status: "",
  user_uuid: "",
};

export const BROADCAST_FIELDS = [
  "title",
  "body",
  "type",
  "status",
  "user_uuid",
] as const;

// The API body. Targeting keys are OMITTED rather than sent empty: the
// handoff is explicit that no targeting fields means everyone, and that a PUT
// replaces targeting wholesale — so sending `type: null` and sending nothing
// are not the same request.
export function toBroadcastPayload(values: BroadcastValues) {
  const base = { title: values.title.trim(), body: values.body.trim() };

  if (values.audience === "user") {
    return { ...base, user_uuid: values.user_uuid.trim() };
  }

  if (values.audience === "segment") {
    return {
      ...base,
      ...(values.type.trim() ? { type: values.type.trim() } : {}),
      ...(values.status.trim() ? { status: values.status.trim() } : {}),
    };
  }

  return base;
}

// The filters shape, from the form's values — for describing the audience
// while composing, before anything has been saved.
//
// The form holds `type` and `status` as plain strings so a Select can clear
// them to "". The narrowing to the API's unions happens HERE, once, rather
// than as a cast at each call site: the values are constrained by the
// dropdowns, and doing it in one place means describeAudience is fed the same
// shape whether it is describing a draft from the API or one being typed.
export function toBroadcastFilters(values: BroadcastValues): BroadcastFilters {
  if (values.audience === "user") {
    const uuid = values.user_uuid.trim();
    return uuid ? { user_uuid: uuid } : null;
  }

  if (values.audience === "segment") {
    const type = values.type.trim();
    const status = values.status.trim();
    if (!type && !status) return null;
    return {
      ...(type ? { type: type as NonNullable<BroadcastFilters>["type"] } : {}),
      ...(status ? { status: status as NonNullable<BroadcastFilters>["status"] } : {}),
    };
  }

  return null;
}

// Turning a saved draft back into form values, for the edit screen.
export function toBroadcastValues(broadcast: {
  title: string;
  body: string;
  filters: { type?: string; status?: string; user_uuid?: string } | null;
}): BroadcastValues {
  const filters = broadcast.filters ?? {};
  const audience: BroadcastAudienceMode = filters.user_uuid
    ? "user"
    : filters.type || filters.status
      ? "segment"
      : "everyone";

  return {
    title: broadcast.title,
    body: broadcast.body,
    audience,
    type: filters.type ?? "",
    status: filters.status ?? "",
    user_uuid: filters.user_uuid ?? "",
  };
}
