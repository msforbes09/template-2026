"use client";

import { forwardRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { env } from "@/lib/env";

export const TurnstileField = forwardRef<
  TurnstileInstance,
  { onVerify: (token: string) => void; onExpire?: () => void }
>(function TurnstileField({ onVerify, onExpire }, ref) {
  return (
    <Turnstile
      ref={ref}
      siteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      onSuccess={onVerify}
      onExpire={onExpire}
      options={{ theme: "auto" }}
      className="mx-auto"
    />
  );
});
