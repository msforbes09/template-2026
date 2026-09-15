import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo/logo-egov-api.svg"
      alt="eGov API"
      width={425}
      height={108}
      priority
      className={cn("h-7 w-auto", className)}
    />
  );
}
