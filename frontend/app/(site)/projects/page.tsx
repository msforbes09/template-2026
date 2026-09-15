import type { Metadata } from "next";
import {
  PublicProjectsPage,
  type PublicProjectsSearchParams,
} from "@/modules/projects/components/public-projects-page";

// Deliberately event-neutral. One URL now serves every event (the event is a
// query param, since slugs are regenerated on rename), so naming a single
// programme here would be wrong the moment a second one runs — and stale the
// moment this one is renamed. The event's own name is rendered on the page,
// where it comes from the API.
const TITLE = "Project showcase";
const DESCRIPTION =
  "Projects built on the eGov APIs and published to the showcase — what each team built, the services they connected to, and a demo you can watch.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/projects" },
  openGraph: { type: "website", url: "/projects", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function ProjectsPage({
  searchParams,
}: {
  searchParams: PublicProjectsSearchParams;
}) {
  return (
    <PublicProjectsPage
      kicker="Project showcase"
      title={
        <>
          Built on the <span className="text-primary">eGov APIs</span>
        </>
      }
      description={DESCRIPTION}
      searchParams={searchParams}
    />
  );
}
