import Link from "next/link";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

// The placeholder landing hero. Synchronous and free of request-time data, so
// the whole landing page prerenders. A project replaces the copy and adds its
// own sections below it.
export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-5xl px-6 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
          {env.NEXT_PUBLIC_APP_NAME}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Replace this hero with the product&apos;s own message. Accounts, notifications and
          the admin console are already wired to the API.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
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
    </section>
  );
}
