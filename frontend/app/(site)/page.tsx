import type { Metadata } from "next";
import { env } from "@/lib/env";
import { Hero } from "@/modules/landing/components/hero";
import { LandingJsonLd } from "@/modules/landing/components/landing-json-ld";

export const metadata: Metadata = {
  description: "Sign in or create an account.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: env.NEXT_PUBLIC_APP_NAME,
    description: "Sign in or create an account.",
  },
  twitter: {
    card: "summary",
    title: env.NEXT_PUBLIC_APP_NAME,
    description: "Sign in or create an account.",
  },
};

// The public landing page. One static hero: a project replaces it with its
// own sections, each Suspense-wrapped if it reads request-time data.
export default function LandingPage() {
  return (
    <>
      <LandingJsonLd />
      <Hero />
    </>
  );
}
