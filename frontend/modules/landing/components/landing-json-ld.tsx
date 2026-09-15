import { env } from "@/lib/env";
import { serializeJsonLd } from "@/lib/json-ld";

// The site's structured data. The organisation is the product itself; a
// project with a separate publisher adds it here.
export function LandingJsonLd() {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const name = env.NEXT_PUBLIC_APP_NAME;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name,
        publisher: { "@id": `${base}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name,
        url: base,
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
