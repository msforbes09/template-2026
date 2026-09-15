import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  CircleCheck,
  Coins,
  Eye,
  EyeOff,
  FileWarning,
  Megaphone,
  MessageSquare,
  PartyPopper,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { AppNotification, NotificationReference } from "@/types/notification";

// Turning one notification into something a person can read and click.
//
// Since the 2026-08-28 contract change the BACKEND owns the copy: `title` and
// `message` arrive server-rendered (branding, the anonymous-reviewer rule and
// unknown-type fallbacks included) and are rendered verbatim. What stays here
// is everything presentational — icon, tone, toast — keyed by type, and the
// routing, because the backend deliberately sends identifiers, not URLs.
//
// Pure, so it can be tested without a socket, a session or a DOM. The
// components are then only layout.

export type NotificationTone =
  // Good news — approvals, publications, awards.
  | "positive"
  // Needs attention but not alarming — returns, low credits.
  | "warning"
  // Sanctions and exhausted pools.
  | "critical"
  // Security events: not bad news, but worth reading carefully.
  | "security"
  // Everything else.
  | "neutral";

export type NotificationContent = {
  icon: LucideIcon;
  tone: NotificationTone;
  title: string;
  // The second line. Null when the title says everything.
  body: string | null;
  // Where clicking goes. Null when there is nowhere useful to send them.
  href: string | null;
  // Whether this one is worth interrupting someone with a toast. The handoff
  // asks for the delightful ones only — never sanctions or security, which
  // belong in the panel where they can be read properly.
  toast: boolean;
};

// Types whose PROJECT reference should land on the owner's manage page
// rather than the public show: review.created reaches the project's owner,
// and submitted/sent_back describe a project that is not public yet — the
// public show would 404. review.replied is usually the reviewer's (a visitor,
// so public) — EXCEPT the for_owner payload variant, where the reviewer
// replied in their own thread and the recipient is the owner.
const OWNER_PROJECT_TYPES = new Set([
  "review.created",
  "review.updated",
  "project.submitted",
  "project.sent_back",
  // Tagging can land on an unpublished project; hiding by definition leaves
  // no public page.
  "project.tagged",
  "project.hidden",
]);

function isOwnerFacing(type: string | undefined, data?: Record<string, unknown>): boolean {
  if (!type) return false;
  if (OWNER_PROJECT_TYPES.has(type)) return true;
  return type === "review.replied" && Boolean(data?.for_owner);
}

// The project or catalog a notification points at. Routing lives here because
// the backend deliberately sends identifiers, not URLs.
export function referenceHref(
  reference: NotificationReference,
  type?: string,
  data?: Record<string, unknown>,
): string | null {
  if (!reference) return null;
  if (reference.type === "project") {
    return isOwnerFacing(type, data)
      ? `/dashboard/projects/${reference.uuid}`
      : `/projects/${reference.uuid}`;
  }
  if (reference.type === "api_catalog") {
    // Credit alerts land on the Usage tab — the meter they are about — not
    // the default documentation tab. The page resolves ?tab= from the URL.
    const usageTab =
      type === "credits.low" || type === "credits.exhausted" || type === "credits.topped_up";
    return `/dashboard/api-catalogs/${reference.identifier}${usageTab ? "?tab=usage" : ""}`;
  }
  // A reference type this build has never heard of. Falling back to null is
  // right: a guessed URL is worse than no link.
  return null;
}

// Fallback destinations for the types whose reference is null, from the
// handoff's table.
const TYPE_HREF: Record<string, string> = {
  welcome: "/dashboard",
  "welcome.back": "/dashboard",
  // Completion unlocks browsing/reviewing projects — land on the showcase.
  "profile.completed": "/projects",
  // The whole application lifecycle lands on the dashboard — status,
  // remarks and the resubmit control all live there.
  "application.received": "/dashboard",
  "application.approved": "/dashboard",
  "application.returned": "/dashboard",
  "project.deleted": "/dashboard/projects",
  "sanction.suspended": "/dashboard",
  "sanction.unsuspended": "/dashboard",
  "sanction.demoted": "/dashboard",
  "security.password_changed": "/dashboard",
  "security.account_recovered": "/dashboard",
};

type Presentation = { icon: LucideIcon; tone: NotificationTone; toast: boolean };

// How each known type LOOKS — the text no longer lives here. Unlisted types
// get the fallback below; the backend guarantees them a sensible title.
const PRESENTATION: Record<string, Presentation> = {
  welcome: { icon: PartyPopper, tone: "positive", toast: false },
  "welcome.back": { icon: PartyPopper, tone: "neutral", toast: false },
  "profile.completed": { icon: CircleCheck, tone: "positive", toast: false },
  "review.created": { icon: Star, tone: "positive", toast: false },
  "review.updated": { icon: Star, tone: "neutral", toast: false },
  "review.replied": { icon: MessageSquare, tone: "neutral", toast: false },
  "application.received": { icon: CircleCheck, tone: "neutral", toast: false },
  "application.approved": { icon: BadgeCheck, tone: "positive", toast: true },
  "application.returned": { icon: FileWarning, tone: "warning", toast: false },
  "project.submitted": { icon: CircleCheck, tone: "neutral", toast: false },
  "project.published": { icon: CircleCheck, tone: "positive", toast: true },
  "project.sent_back": { icon: FileWarning, tone: "warning", toast: false },
  "project.tagged": { icon: Trophy, tone: "positive", toast: true },
  "project.hidden": { icon: EyeOff, tone: "warning", toast: false },
  "project.unhidden": { icon: Eye, tone: "positive", toast: false },
  "project.deleted": { icon: Trash2, tone: "warning", toast: false },
  "sanction.suspended": { icon: ShieldAlert, tone: "critical", toast: false },
  "sanction.unsuspended": { icon: ShieldCheck, tone: "positive", toast: false },
  "sanction.demoted": { icon: ShieldAlert, tone: "critical", toast: false },
  "credits.low": { icon: AlertTriangle, tone: "warning", toast: false },
  "credits.exhausted": { icon: AlertTriangle, tone: "critical", toast: false },
  // Good news, worth surfacing live — an admin just funded the pool.
  "credits.topped_up": { icon: Coins, tone: "positive", toast: true },
  "security.password_changed": { icon: ShieldCheck, tone: "security", toast: false },
  "security.account_recovered": { icon: ShieldCheck, tone: "security", toast: false },
  announcement: { icon: Megaphone, tone: "neutral", toast: false },
};

const FALLBACK_PRESENTATION: Presentation = { icon: Bell, tone: "neutral", toast: false };

export function notificationContent(notification: AppNotification): NotificationContent {
  const { icon, tone, toast } = PRESENTATION[notification.type] ?? FALLBACK_PRESENTATION;

  return {
    icon,
    tone,
    toast,
    title: notification.title,
    body: notification.message ?? null,
    href:
      referenceHref(notification.data.reference, notification.type, notification.data) ??
      TYPE_HREF[notification.type] ??
      null,
  };
}
