import { ProjectFormSkeleton } from "@/modules/projects/components/project-form-skeleton";

export default function NewProjectLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <div aria-hidden className="h-5 w-28 animate-pulse rounded bg-muted/60" />
      <div aria-hidden className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <ProjectFormSkeleton />
    </div>
  );
}
