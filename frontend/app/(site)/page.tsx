import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/modules/landing/components/hero";
import {
  ServiceCards,
  ServiceCardsSkeleton,
} from "@/modules/landing/components/service-cards";
import { LogoMarquee } from "@/modules/landing/components/logo-marquee";
import { Features } from "@/modules/landing/components/features";
import { DigitalPlatforms } from "@/modules/landing/components/digital-platforms";
import { AccessSteps } from "@/modules/landing/components/access-steps";
import { ProjectShowcase } from "@/modules/landing/components/project-showcase";
import { HackathonShowcase } from "@/modules/landing/components/hackathon-showcase";
import { CtaSection } from "@/modules/landing/components/cta-section";
import { LandingJsonLd } from "@/modules/landing/components/landing-json-ld";

export const metadata: Metadata = {
  description:
    "The eGov API marketplace — the first Government-as-a-Service platform. Register your organization, get administrator approval, and integrate eVerify, eGov SSO, eMessage, eGovPay, eGov AI, eGovChain, Face Liveness, eReport and Compass.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "eGov API Developer Portal",
    description:
      "The eGov API marketplace and the first Government-as-a-Service platform. One gateway to Philippine government APIs, granted after administrator approval.",
  },
  twitter: {
    card: "summary",
    title: "eGov API Developer Portal",
    description:
      "The eGov API marketplace and the first Government-as-a-Service platform. One gateway to Philippine government APIs, granted after administrator approval.",
  },
};

export default function LandingPage() {
  return (
    <>
      <LandingJsonLd />
      <Hero />
      {/* Streams rather than sitting in the static shell: each card's
          destination depends on whether the visitor is an approved developer
          (see ServiceCards). The catalog read itself is still cached, and an
          anonymous visitor never triggers a profile fetch, so the hole
          resolves immediately for nearly all traffic. */}
      <Suspense fallback={<ServiceCardsSkeleton />}>
        <ServiceCards />
      </Suspense>
      <LogoMarquee />
      <Features />
      <DigitalPlatforms />
      {/* What the showcase IS, then what is in it. Static and always present,
          which is what lets the band below disappear when nothing is published
          without the feature going unmentioned. */}
      <ProjectShowcase />
      {/* Renders nothing until the first project is published, so the band
          never appears empty. Suspended because it reads the showcase. */}
      <Suspense fallback={null}>
        <HackathonShowcase />
      </Suspense>
      <AccessSteps />
      <CtaSection />
    </>
  );
}
