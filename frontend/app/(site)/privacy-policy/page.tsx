import type { Metadata } from "next";
import { ContentPage } from "@/modules/content/components/content-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How we collect, use, and protect your information.",
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    type: "website",
    url: "/privacy-policy",
    title: "Privacy Policy",
    description:
      "How we collect, use, and protect your information.",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy",
    description: "How we collect, use, and protect your information.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <ContentPage
      identifier="privacy-policy"
      title="Privacy Policy"
      kicker="Legal"
      lede="How we collect, use, and protect your information."
    />
  );
}
