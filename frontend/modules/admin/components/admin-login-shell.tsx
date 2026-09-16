import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { AdminLoginForm } from "@/modules/admin/components/admin-login-form";

export function AdminLoginShell() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(135deg,#1452f0,#0b2db0)] p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-size-[32px_32px]"
        />
        <Link href="/" className="relative w-fit rounded-md bg-white/95 px-3 py-2">
          <Logo />
        </Link>
        <div className="relative max-w-md space-y-4">
          <span className="inline-flex size-11 items-center justify-center rounded-lg bg-white/10">
            <ShieldCheck aria-hidden className="size-5 text-highlight" />
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-white">
            Administer the platform
          </h1>
          <p className="text-sm leading-relaxed text-blue-100/90">
            Manage accounts, content and announcements from one console.
          </p>
        </div>
        <p className="relative text-xs text-blue-200/80">
          Restricted to authorized administrators.
        </p>
      </div>

      <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 block w-fit lg:hidden">
            <Logo />
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight">Admin sign in</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in with your administrator email and password.
          </p>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
