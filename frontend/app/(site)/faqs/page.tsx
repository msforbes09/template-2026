import type { Metadata } from "next";
import { ContentPage } from "@/modules/content/components/content-page";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Answers to common questions about the service.",
  alternates: { canonical: "/faqs" },
  openGraph: {
    type: "website",
    url: "/faqs",
    title: "FAQs",
    description:
      "Answers to common questions about the service.",
  },
  twitter: {
    card: "summary",
    title: "FAQs",
    description: "Answers to common questions about the service.",
  },
};

export default function FaqsPage() {
  return (
    <ContentPage
      identifier="faqs"
      title="FAQs"
      kicker="Support"
      lede="Answers to common questions about the service."
    />
  );
}
