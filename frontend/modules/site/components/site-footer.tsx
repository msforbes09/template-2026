import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { env } from "@/lib/env";

const LINKS = [
  { href: "/faqs", label: "FAQs" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-6 py-10 sm:px-9 lg:flex-row lg:items-center lg:justify-between lg:px-16">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-sm text-muted-foreground">
            © {env.NEXT_PUBLIC_APP_NAME}. All rights reserved.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-primary">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
