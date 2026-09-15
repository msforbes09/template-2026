import { env } from "@/lib/env";
import { projectExcerpt } from "@/modules/projects/lib/project-excerpt";
import { projectCredits } from "@/modules/projects/lib/project-payload";
import { youTubeEmbedUrl } from "@/modules/projects/lib/youtube";
import type { PublicProject } from "@/types/project";
import { serializeJsonLd } from "@/lib/json-ld";

// A hackathon entry is a CreativeWork — software that exists as a demo and a
// story, not a distributable application — paired with its demo VideoObject
// and a BreadcrumbList placing it under the showcase. Takes the project the
// page already fetched so this renders in the same pass and lands in the
// initial HTML, where crawlers read it.
export function PublicProjectJsonLd({ project }: { project: PublicProject }) {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const url = `${base}/projects/${project.uuid}`;
  const description = project.tagline ?? projectExcerpt(project.description);
  const credits = projectCredits(project.meta);
  const embedUrl = youTubeEmbedUrl(project.video_url);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${url}#project`,
        name: project.name,
        url,
        description,
        datePublished: project.published_at,
        ...(project.photo?.url ? { image: project.photo.url } : {}),
        // Tags, tech and the APIs integrated with are all things a person
        // would search for.
        keywords: [...project.tags, ...project.tech_stack, ...project.egov_apis_used].join(", "),
        ...(project.repository_url ? { codeRepository: project.repository_url } : {}),
        // The public site exposes no account identity — the only creditable
        // name is whatever the team put in `meta`.
        ...(credits.team ? { creator: { "@type": "Organization", name: credits.team } } : {}),
        // Only claimed when the project actually belongs to an event, and
        // named from the project itself rather than a fixed programme.
        ...(project.egov_event
          ? {
              isPartOf: {
                "@type": "Event",
                name: project.egov_event.name,
                url: `${base}/projects?event=${encodeURIComponent(project.egov_event.slug)}`,
              },
            }
          : {}),
        ...(embedUrl
          ? {
              video: {
                "@type": "VideoObject",
                name: `${project.name} — demo`,
                description,
                embedUrl,
                uploadDate: project.published_at,
                ...(project.photo?.url ? { thumbnailUrl: project.photo.url } : {}),
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: base },
          { "@type": "ListItem", position: 2, name: "Projects", item: `${base}/projects` },
          { "@type": "ListItem", position: 3, name: project.name, item: url },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}
