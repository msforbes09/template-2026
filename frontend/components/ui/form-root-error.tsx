"use client";

import { useFormContext } from "react-hook-form";

export function FormRootError() {
  const { formState } = useFormContext();
  const message = formState.errors.root?.message as string | undefined;

  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
    >
      {message}
    </p>
  );
}
