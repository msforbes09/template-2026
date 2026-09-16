"use client";

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function OtpField<TFieldValues extends FieldValues>({
  control,
  name,
  length = 6,
  id,
  mask,
  autoComplete = "one-time-code",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  length?: number;
  id?: string;
  // PIN-style entry (filled dots instead of digits) rather than a
  // one-time code, which is normally fine to read back on screen.
  mask?: boolean;
  autoComplete?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <InputOTP
          id={id}
          maxLength={length}
          pattern={REGEXP_ONLY_DIGITS}
          autoComplete={autoComplete}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          value={field.value ?? ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          containerClassName="w-full"
        >
          <InputOTPGroup>
            {Array.from({ length }, (_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                mask={mask}
                aria-invalid={ariaInvalid}
                className="h-11 text-lg font-medium sm:h-12"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      )}
    />
  );
}
