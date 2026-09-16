import {
  Bell,
  CircleCheck,
  Megaphone,
  PartyPopper,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { AppNotification, NotificationReference } from "@/types/notification";

// Turning one notification into something a person can read and click.
//
// The BACKEND owns the copy: `title` and `message` arrive server-rendered
// (branding and unknown-type fallbacks included) and are rendered verbatim.
// What stays here is everything presentational — icon, tone, toast — keyed by
// type, and the routing, because the backend deliberately sends identifiers,
// not URLs.
//
// Pure, so it can be tested without a socket, a session or a DOM. The
// components are then only layout.

export type NotificationTone =
  // Good news.
  | "positive"
  // Needs attention but not alarming.
  | "warning"
  // Something is broken or blocked.
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
  // Whether this one is worth interrupting someone with a toast. Never
  // security events, which belong in the panel where they can be read
  // properly.
  toast: boolean;
};

// The thing a notification points at. Routing lives here because the backend
// deliberately sends identifiers, not URLs. The template routes no reference
// type; a project adds a branch per type it introduces.
//
// WHEN A ROUTE MOVES: this file and TYPE_HREF below are hardcoded strings,
// not derived from the router — a stale entry fails silently as a clicked
// notification landing on a 404. Update them and the test in the same change.
export function referenceHref(reference: NotificationReference): string | null {
  if (!reference) return null;
  // A reference type this build has never heard of. Falling back to null is
  // right: a guessed URL is worse than no link.
  return null;
}

// Fallback destinations for the types whose reference is null.
const TYPE_HREF: Record<string, string> = {
  welcome: "/dashboard",
  "welcome.back": "/dashboard",
  "profile.completed": "/dashboard/profile",
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
    href: referenceHref(notification.data.reference) ?? TYPE_HREF[notification.type] ?? null,
  };
}
