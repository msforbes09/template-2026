import { env } from "@/lib/env";
import { serializeJsonLd } from "@/lib/json-ld";

export function LandingJsonLd() {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: "eGov API Developer Portal",
        description:
          "The eGov API marketplace — the first Government-as-a-Service platform for Philippine government APIs. Register, get approved, and integrate eVerify, eGov SSO, eGovPay and more.",
        publisher: { "@id": `${base}/#organization` },
      },
      {
        "@type": "GovernmentOrganization",
        "@id": `${base}/#organization`,
        name: "Department of Information and Communications Technology",
        alternateName: "DICT",
        url: "https://dict.gov.ph",
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
