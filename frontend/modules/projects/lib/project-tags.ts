import type { LucideIcon } from "lucide-react";
import { icons } from "lucide-react";
import {
  BarChart3,
  Brain,
  Bus,
  CreditCard,
  Database,
  Flag,
  Globe,
  GraduationCap,
  HeartPulse,
  Landmark,
  Link as LinkIcon,
  MessageCircle,
  Send,
  ShieldCheck,
  Smartphone,
  Tag,
  Trophy,
} from "lucide-react";
import type { EgovEvent, ProjectTag, ProjectTagGroup } from "@/types/project";
import { eventCustomTags } from "@/types/project";

// Projects carry tags as plain names ("tags": ["eGov Hackathon 2026", "TOP
// 30"]); the color and icon for a name live only in the catalogue at
// GET common/project-tags. The API assumes the client joins the two, which
// is what this file does — a name the catalogue doesn't know (a renamed or
// retired tag on an older project) still renders, as a neutral chip, instead
// of disappearing or throwing.

// Slate-500. Deliberately not one of the catalogue's colors, so an unknown
// tag reads as "uncategorised" rather than impersonating a curated one.
const FALLBACK_COLOR = "#64748B";
const FALLBACK_ICON = "tag";

// The catalogue's `icon` is a lucide-style slug.
//
// This map is no longer the whole story — since curation labels became
// per-event (2026-08-26), an administrator can put ANY lucide slug on a tag
// when creating an event, and waiting for a frontend release to render it
// would defeat the point. tagIcon therefore falls back to looking the slug up
// in lucide's own registry.
//
// The map stays as an OVERRIDE rather than being deleted, because the registry
// is not a superset of it: `bar-chart-3` is a renamed alias that resolves as a
// named export but is absent from `icons`, so a purely dynamic lookup would
// silently downgrade the catalogue's own "Data & Analytics" tag to a generic
// glyph. Explicit first, registry second, generic last.
const ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  flag: Flag,
  smartphone: Smartphone,
  globe: Globe,
  brain: Brain,
  "message-circle": MessageCircle,
  "bar-chart-3": BarChart3,
  "credit-card": CreditCard,
  "shield-check": ShieldCheck,
  send: Send,
  database: Database,
  link: LinkIcon,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  bus: Bus,
  landmark: Landmark,
  tag: Tag,
};

// "bar-chart-3" -> "BarChart3", which is how lucide keys its registry.
function slugToPascal(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function tagIcon(icon: string): LucideIcon {
  const explicit = ICONS[icon];
  if (explicit) return explicit;

  const dynamic = (icons as Record<string, LucideIcon>)[slugToPascal(icon)];
  return dynamic ?? Tag;
}

// The tags assignable to, or displayable on, a project in an event's context:
// the global catalogue plus that event's own curation labels.
//
// GET common/project-tags stopped returning a `Curation` group on 2026-08-26,
// so a project carrying "TOP 30" now joins against a catalogue that has never
// heard of it and renders as a neutral "uncategorised" chip. Merging the
// event's labels back in is what restores its colour and glyph.
//
// The event wins on a name collision: it is the more specific source, and it
// is the set the backend validates a tag assignment against.
//
// The same merge in the grouped form the tag picker renders.
//
// The event's labels lead, because assigning one is what an administrator
// opens that picker to do — the descriptive groups are the background set.
// The group is titled with the event's name rather than a generic "Curation",
// since that is precisely the distinction the backend now enforces: it accepts
// the catalogue plus THIS project's event's tags, and answers 422 for another
// event's label.
export function withEventTagGroup(
  groups: ProjectTagGroup[],
  event: EgovEvent | null | undefined,
): ProjectTagGroup[] {
  const custom = event ? eventCustomTags(event) : [];
  if (custom.length === 0) return groups;
  return [{ group: event!.name, tags: custom }, ...groups];
}

// A project belonging to no event gets the catalogue unchanged.
export function mergeEventTags(
  catalog: ProjectTag[],
  event: EgovEvent | null | undefined,
): ProjectTag[] {
  const custom = event ? eventCustomTags(event) : [];
  if (custom.length === 0) return catalog;

  const overridden = new Set(custom.map((tag) => tag.name));
  return [...custom, ...catalog.filter((tag) => !overridden.has(tag.name))];
}

// Joins a project's tag names against the catalogue, preserving the order the
// project returned them in (the API puts the curated tags first).
export function resolveTags(names: string[], catalog: ProjectTag[]): ProjectTag[] {
  const byName = new Map(catalog.map((tag) => [tag.name, tag]));
  return names.map(
    (name) => byName.get(name) ?? { name, color: FALLBACK_COLOR, icon: FALLBACK_ICON },
  );
}

// Chips are tinted from the catalogue's hex rather than a Tailwind class, so
// a tag added by the backend is styled without a frontend release. The text
// takes the full color and the surface a 12%/40% wash of it — legible on both
// themes without needing a per-tag contrast decision.
export function tagChipStyle(color: string): React.CSSProperties {
  return {
    color,
    backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
    borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
  };
}
