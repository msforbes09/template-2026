import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { env } from "@/lib/env";

// Full-bleed, chrome-free auth shell (Server Component, CSS-only motion).
// The focused form column takes the left 2/5 of the viewport and is the only
// thing visible below `lg`; a branded panel fills the right 3/5. Shared by
// /login, /register and /forgot-password under the `(auth)` route group so
// every auth surface reads the same. The site navbar/footer are intentionally
// absent — the "Back to home" control in the form column replaces them.

// Logo lockup on the primary panel: a white chip keeps the mark legible
// against the dark field. Doubles as a home link.
function PanelLockup() {
  return (
    <Link
      href="/"
      aria-label={`${env.NEXT_PUBLIC_APP_NAME}, home`}
      className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-foreground shadow-sm ring-1 ring-black/5 transition-transform hover:-translate-y-px"
    >
      <Logo />
    </Link>
  );
}

export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh w-full lg:grid-cols-5">
      {/* Form column — left 2/5, full-bleed, the only column below `lg` */}
      <div className="relative flex min-h-dvh flex-col px-6 py-8 sm:px-10 lg:col-span-2 lg:px-14">
        {/* Top bar: home nav (all sizes) + brand mark (mobile only) */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="-ml-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Back to home
          </Link>
          <span className="lg:hidden">
            <Logo />
          </span>
        </div>

        {/* Centered form */}
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && (
            <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/70 lg:text-left">
          © {env.NEXT_PUBLIC_APP_NAME}. All rights reserved.
        </p>
      </div>

      {/* Branded panel — right 3/5, desktop only, full-bleed */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:col-span-3 lg:flex lg:flex-col">
        {/* Fine grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Soft light source */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/20 blur-3xl"
        />
        <div className="relative px-10 pt-10 xl:px-14 xl:pt-14">
          <PanelLockup />
          <div className="mt-10 max-w-xl xl:mt-12">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/70">
              <span aria-hidden className="size-1.5 rounded-full bg-sun" />
              {env.NEXT_PUBLIC_APP_NAME}
            </p>
            <h2 className="mt-4 text-[clamp(1.9rem,2.6vw,2.75rem)] font-semibold leading-[1.08] tracking-tight text-white">
              One secure account.
            </h2>
            <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-white/75">
              Replace this panel copy with the product&apos;s own message.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
