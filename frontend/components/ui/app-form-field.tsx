"use client";

import { cloneElement, isValidElement, useId } from "react";
import { cn } from "@/lib/utils";

type FieldChildProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function AppFormField({
  label,
  isRequired,
  userInfo,
  error,
  children,
  className,
}: {
  label: string;
  isRequired?: boolean;
  userInfo?: string;
  error?: string;
  children: React.ReactElement<FieldChildProps>;
  className?: string;
}) {
  const id = useId();
  const hintId = userInfo ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {isRequired && (
          <span aria-hidden className="text-destructive">
            {" "}
            *
          </span>
        )}
      </label>
      {isValidElement(children)
        ? cloneElement(children, {
            id,
            "aria-invalid": !!error,
            "aria-describedby": describedBy,
          })
        : children}
      {userInfo && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {userInfo}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
