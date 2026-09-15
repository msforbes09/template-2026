import { CircleDot, FileEdit, Radio, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { projectStatusLabel, type ProjectStatusTone } from "@/modules/projects/lib/project-status";
import type { ProjectStatus } from "@/types/project";

// `status` alone never tells the whole story — a "draft" with a live snapshot
// is still public. The badge always reads the pair (see project-status.ts),
// and carries an icon as well as a color so the state isn't signalled by
// color alone.
const TONES: Record<ProjectStatusTone, { className: string; icon: typeof CircleDot }> = {
  draft: { className: "bg-muted text-muted-foreground", icon: FileEdit },
  review: {
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: CircleDot,
  },
  changes: {
    className: "bg-destructive/10 text-destructive",
    icon: RotateCcw,
  },
  live: {
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: Radio,
  },
};

export function ProjectStatusBadge({
  status,
  isPublished,
  className,
}: {
  status: ProjectStatus;
  isPublished: 0 | 1;
  className?: string;
}) {
  const { label, tone } = projectStatusLabel(status, isPublished);
  const { className: toneClass, icon: Icon } = TONES[tone];

  return (
    <Badge variant="secondary" className={cn("gap-1.5", toneClass, className)}>
      <Icon aria-hidden className="size-3" />
      {label}
    </Badge>
  );
}
