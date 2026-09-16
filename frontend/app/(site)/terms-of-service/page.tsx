import type { Metadata } from "next";
import { ContentPage } from "@/modules/content/components/content-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern access to and use of the service.",
  alternates: { canonical: "/terms-of-service" },
  openGraph: {
    type: "website",
    url: "/terms-of-service",
    title: "Terms of Service",
    description:
      "The terms that govern access to and use of the service.",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service",
    description: "The terms that govern access to and use of the service.",
  },
};

export default function TermsOfServicePage() {
  return (
    <ContentPage
      identifier="terms-of-service"
      title="Terms of Service"
      kicker="Legal"
      lede="The terms that govern access to and use of the service."
    />
  );
}
