import { z } from "zod";

// Mirrors the API's rule for PATCH /users/{uuid}/gateway-quota.
//
// The body took only `amount` until 2026-08-24; credits are now ONE POOL PER
// API CATALOG, so the pool being topped up has to be named. An unknown slug is
// a 422 from the backend (it validates against the configured partners), which
// is why `platform` is only checked for presence here — the frontend has no
// authoritative partner list of its own, and inventing one would reject a
// partner the backend had just added.
//
// `amount` is unchanged — a positive multiple of 100 — but what it MEANS now
// depends on the selected pool's period, and only the backend knows that:
//   - lifetime pool → the amount is ADDED to the allowance;
//   - daily pool    → the amount SETS the daily allowance, and may not be
//                     lower than the current one (400
//                     `allowance_cannot_be_lowered`, with the current
//                     allowance in `meta.allowance`).
// The set-vs-add distinction is a labelling concern, handled in the modal
// against the pool the admin picked, not a validation one.
//
// Validated as the string the input actually holds, then transformed to the
// number the API wants, so an empty or non-numeric field gets its own message
// instead of silently coercing to 0.
export const gatewayQuotaSchema = z.object({
  platform: z.string().trim().min(1, "Choose which API to top up"),
  amount: z
    .string()
    .trim()
    .min(1, "Enter an amount")
    .regex(/^\d+$/, "Enter a whole number of credits")
    .transform(Number)
    .refine((value) => value >= 100, "Enter at least 100 credits")
    .refine((value) => value % 100 === 0, "Amount must be a multiple of 100"),
});

export type GatewayQuotaFormValues = z.input<typeof gatewayQuotaSchema>;
export type GatewayQuotaValues = z.output<typeof gatewayQuotaSchema>;
