import type { Metadata } from "next";
import { ContentPage } from "@/modules/content/components/content-page";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Answers to common questions about accessing and integrating Philippine government APIs through the eGov API Developer Portal.",
  alternates: { canonical: "/faqs" },
  openGraph: {
    type: "website",
    url: "/faqs",
    title: "FAQs",
    description:
      "Answers to common questions about accessing and integrating Philippine government APIs through the eGov API Developer Portal.",
  },
  twitter: {
    card: "summary",
    title: "FAQs",
    description: "Answers to common questions about the eGov API Developer Portal.",
  },
};

export default function FaqsPage() {
  return (
    <ContentPage
      identifier="faqs"
      title="FAQs"
      kicker="Support"
      lede="Answers to common questions about accessing and integrating Philippine government APIs through the eGov API Developer Portal."
    />
  );
}
