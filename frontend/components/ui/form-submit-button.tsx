"use client";

import { Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export function FormSubmitButton({
  children,
  className,
  disabled,
  ...variantProps
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
} & VariantProps<typeof buttonVariants>) {
  const { formState } = useFormContext();

  return (
    <Button
      type="submit"
      disabled={formState.isSubmitting || disabled}
      className={cn("gap-2", className)}
      {...variantProps}
    >
      {formState.isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}
