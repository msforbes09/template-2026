import { Bell, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

// The placeholder landing hero. Synchronous and free of request-time data, so
// the whole landing page prerenders. A project replaces the copy and adds its
// own sections below it.

const WIRED = [
  { icon: UserRound, label: "Accounts", detail: "Registration, email OTP sign-in, profiles" },
  { icon: Bell, label: "Notifications", detail: "Realtime stream, bell, read state" },
  { icon: ShieldCheck, label: "Admin console", detail: "Roles, permissions, audit logs" },
] as const;

export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid w-full max-w-[1600px] items-center gap-12 px-6 py-20 sm:px-9 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-16 lg:py-28">
        <div className="max-w-2xl">
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.03em] text-foreground sm:text-6xl lg:text-7xl">
            {env.NEXT_PUBLIC_APP_NAME}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Replace this hero with the product&apos;s own message. Accounts, notifications and
            the admin console are already wired to the API.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button className="h-12 px-6 text-base" nativeButton={false} render={<Link href="/login" />}>
              Log in
            </Button>
            <Button
              variant="outline"
              className="h-12 px-6 text-base"
              nativeButton={false}
              render={<Link href="/register" />}
            >
              Create an account
            </Button>
          </div>
        </div>

        <div className="relative isolate overflow-hidden rounded-[2rem] bg-primary p-8 text-primary-foreground shadow-[0_24px_60px_-24px_rgb(15_118_110_/_0.55)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 sm:p-10 dark:shadow-none">
          <div
            aria-hidden
            className="absolute -right-16 -top-16 size-56 rounded-full bg-highlight sm:size-72"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-12 size-64 rounded-full bg-primary-foreground/10"
          />
          <h2 className="relative font-heading text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground/80">
            Already wired
          </h2>
          <ul aria-label="Already wired to the API" className="relative mt-6 divide-y divide-primary-foreground/15">
            {WIRED.map(({ icon: Icon, label, detail }) => (
              <li key={label} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-highlight" />
                <div>
                  <p className="font-heading text-lg font-semibold tracking-tight">{label}</p>
                  <p className="text-sm text-primary-foreground/80">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
