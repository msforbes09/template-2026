import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

// The first thing a freshly approved developer should do. Until now the
// dashboard went straight to credit pools that all read "500 of 500 left, 0
// used" and four links — accurate, but silent on the one step that makes any
// of it usable. Shown only while the account holds no active credential, so it
// disappears the moment they mint one.
export function FirstCredentialCard() {
  return (
    <section
      aria-labelledby="first-credential"
      className="rounded-xl border border-primary/20 bg-primary/5 p-6"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background/70 text-primary"
        >
          <KeyRound className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 id="first-credential" className="text-base font-semibold tracking-tight">
            Get your API credentials
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pick a service, mint a key, and make your first call. Your credits below only start
            counting once you do.
          </p>
          <div className="pt-1">
            <Button
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href="/dashboard/developers" />}
            >
              Browse services
              <ArrowRight aria-hidden className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
