import type { PaginationMeta } from "@/types/pagination";

// The citizen's in-app notification center — GET/POST user/notifications,
// plus the `notification.created` broadcast on their existing private channel
// (the same `user.{uuid}` the gateway-log feed uses).
//
// Per the 2026-08-27 handoff.

// Where a notification points. ALWAYS PRESENT on `data`, either null or an
// object of stable identifiers — never a URL, because routing is the
// frontend's. A null reference means "route by the type instead".
export type NotificationReference =
  | { type: "project"; uuid: string }
  | { type: "api_catalog"; identifier: string }
  | null;

// The 24 types the backend stores today.
//
// Deliberately a union of literals JOINED WITH `string`: the handoff is
// explicit that unknown types may appear later and must render gracefully
// rather than break. That keeps autocomplete and exhaustiveness help for the
// known ones while making an unknown one a legal value rather than a cast.
export type KnownNotificationType =
  | "welcome"
  | "welcome.back"
  | "profile.completed"
  | "review.created"
  | "review.updated"
  | "review.replied"
  | "application.received"
  | "application.approved"
  | "application.returned"
  | "project.submitted"
  | "project.published"
  | "project.sent_back"
  | "project.tagged"
  | "project.hidden"
  | "project.unhidden"
  | "project.deleted"
  | "sanction.suspended"
  | "sanction.unsuspended"
  | "sanction.demoted"
  | "credits.low"
  | "credits.exhausted"
  | "security.password_changed"
  | "security.account_recovered"
  | "announcement";

export type NotificationType = KnownNotificationType | (string & {});

// The payload varies by type (see the handoff's table). It is read
// defensively rather than typed per-type: a discriminated union would have to
// be widened for every new backend type before the UI could render it at all,
// which is the opposite of the graceful-fallback requirement.
//
// `reference` is the one key guaranteed on every type.
export type NotificationData = {
  reference: NotificationReference;
} & Record<string, unknown>;

export type AppNotification = {
  id: number;
  type: NotificationType;
  // Server-rendered copy (2026-08-28 contract change), identical in the list
  // and the broadcast. The backend owns the wording — branding, anonymity
  // rules, unknown-type fallbacks included — so both render VERBATIM.
  // `title` is always present; `message` is the optional second line.
  title: string;
  message: string | null;
  data: NotificationData;
  // `Y-m-d H:i:s`, never ISO-8601. Null until read.
  read_at: string | null;
  created_at: string;
};

// The list's meta carries the bell badge alongside the usual paginator keys.
// `unread_count` is ACCOUNT-WIDE — not the unread count of this page or of
// the current filter — which is exactly what makes it usable as the badge.
export type NotificationPageMeta = {
  current_page: number;
  per_page: number;
  total: number;
  unread_count: number;
  // Laravel's paginator sends these too, but the handoff's example meta lists
  // only the four above — so they are read as optional and derived when
  // absent rather than trusted to be there. See notificationPaginationMeta.
  last_page?: number;
  from?: number | null;
  to?: number | null;
};

export type NotificationPage = {
  data: AppNotification[];
  meta: NotificationPageMeta;
};

// What POST notifications/read-all answers with.
export type MarkAllReadResult = { marked: number };

// The shape broadcast on `.notification.created`. Same row the list returns,
// always unread.
export type NotificationCreatedEvent = AppNotification;

export function isUnread(notification: AppNotification): boolean {
  return notification.read_at === null;
}

// The shape PaginationBar wants, from the shape the notifications list sends.
//
// Derives last_page/from/to when the payload omits them, so the paginator
// renders correctly against both the documented meta and Laravel's fuller
// one. per_page of 0 (the empty fallback) would divide by zero, hence the
// guard — an empty list is one page, not Infinity.
export function notificationPaginationMeta(meta: NotificationPageMeta): PaginationMeta {
  const perPage = meta.per_page > 0 ? meta.per_page : 1;
  const lastPage = meta.last_page ?? Math.max(1, Math.ceil(meta.total / perPage));
  const first = meta.total === 0 ? null : (meta.current_page - 1) * perPage + 1;

  return {
    current_page: meta.current_page,
    last_page: lastPage,
    per_page: perPage,
    total: meta.total,
    from: meta.from ?? first,
    to: meta.to ?? (first === null ? null : Math.min(first + perPage - 1, meta.total)),
  };
}
