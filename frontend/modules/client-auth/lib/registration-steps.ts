import type { StepperStep } from "@/components/ui/stepper";

export type RegistrationStepKey = "account" | "verify" | "profile" | "submit";

export const REGISTRATION_STEPS: readonly StepperStep<RegistrationStepKey>[] = [
  { key: "account", label: "Create account" },
  { key: "verify", label: "Verify" },
  { key: "profile", label: "Profile" },
  { key: "submit", label: "Submit" },
];
