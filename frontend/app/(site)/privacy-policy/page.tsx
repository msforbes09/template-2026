import type { Metadata } from "next";
import { ContentPage } from "@/modules/content/components/content-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How the eGov API Developer Portal collects, uses, and protects your information under the Data Privacy Act of 2012.",
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    type: "website",
    url: "/privacy-policy",
    title: "Privacy Policy",
    description:
      "How the eGov API Developer Portal collects, uses, and protects your information under the Data Privacy Act of 2012.",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy",
    description: "How the eGov API Developer Portal collects, uses, and protects your information.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <ContentPage
      identifier="privacy-policy"
      title="Privacy Policy"
      kicker="Legal"
      lede="How the eGov API Developer Portal collects, uses, and protects your information under the Data Privacy Act of 2012."
    />
  );
}
