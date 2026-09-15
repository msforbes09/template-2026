"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ResourceModal({
  trigger,
  open,
  onOpenChange,
  onOpen,
  title,
  description,
  contentClassName,
  showCloseButton,
  stickyHeader,
  children,
}: {
  trigger?: React.ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen?: () => void;
  title: string;
  description?: string;
  // Overrides the default width/height (e.g. a near-fullscreen editor modal).
  contentClassName?: string;
  // Suppresses the default corner X — for content that provides its own
  // close control (e.g. a toolbar) where the corner X would be redundant.
  showCloseButton?: boolean;
  // Content rendered inside the header, which then STICKS while the body
  // scrolls — for modals whose subject (an identity block, say) should stay
  // on screen. The corner X moves into the sticky block (the default one
  // lives in the scroll area and scrolls away), pinned at the top right.
  stickyHeader?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) onOpen?.();
      }}
    >
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent
        className={cn("sm:max-w-lg", contentClassName)}
        showCloseButton={stickyHeader ? false : showCloseButton}
      >
        <DialogHeader
          className={
            stickyHeader
              ? // The negative offsets let the sticky block's backdrop cover
                // the scrollport's padding edge-to-edge.
                "sticky -top-4 z-10 -mx-4 bg-popover px-4 pt-4 pb-2 -mt-4"
              : undefined
          }
        >
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          {stickyHeader}
          {stickyHeader && (
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-4 right-4"
                  aria-label="Close"
                />
              }
            >
              <X aria-hidden className="size-4" />
            </DialogClose>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
