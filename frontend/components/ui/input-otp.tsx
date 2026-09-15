"use client"

import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"

import { cn } from "@/lib/utils"
import { MinusIcon } from "lucide-react"

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "cn-input-otp flex items-center has-disabled:opacity-50",
        containerClassName
      )}
      spellCheck={false}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex w-full items-center gap-1.5 sm:gap-2", className)}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  mask,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
  // Shows a filled dot instead of the character — for PIN-style entry.
  mask?: boolean
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      data-filled={!!char}
      className={cn(
        "relative flex h-9 min-w-0 flex-1 items-center justify-center rounded-lg border border-input bg-transparent text-sm tabular-nums transition-colors outline-none data-[filled=true]:border-muted-foreground/45 data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    >
      {char ? (mask ? <span aria-hidden className="size-2 rounded-full bg-foreground" /> : char) : null}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      className="flex items-center [&_svg:not([class*='size-'])]:size-4"
      role="separator"
      {...props}
    >
      <MinusIcon
      />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
