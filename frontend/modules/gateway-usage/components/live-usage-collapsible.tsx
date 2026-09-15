"use client";

import { useSyncExternalStore } from "react";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

// The "Right now" live trace, HIDDEN by default — even a collapsed header made
// a permanent claim on the page for a tool most visits never open. The toggle
// BUTTON lives in the section header beside View logs while the section itself
// renders further down, so the two share a tiny store: localStorage (the
// choice survives visits) plus a custom event (same-tab updates; the storage
// event only fires cross-tab), read via useSyncExternalStore. Storage being
// blocked degrades to an in-memory flag for the page view.
//
// The children (the chart, with its Echo subscription) mount only while
// shown, so a hidden dashboard opens no websocket listener and the "starts
// fresh each time you open this" copy stays literally true.
const STORAGE_KEY = "usage-live-visible";
const CHANGE_EVENT = "usage-live-visible-change";

let memoryOpen = false;

function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return memoryOpen;
  }
}

function writeOpen(next: boolean) {
  memoryOpen = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Storage blocked — the in-memory flag still drives this page view.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

// Server snapshot is false, so SSR always renders the hidden state; a viewer
// who left it open sees it appear on hydration.
function useLiveViewOpen(): boolean {
  return useSyncExternalStore(subscribe, readOpen, () => false);
}

// The header button. Placed by the caller beside View logs; label says what a
// click DOES, so it flips.
export function LiveViewToggle() {
  const open = useLiveViewOpen();
  return (
    <Button variant="outline" size="sm" aria-pressed={open} onClick={() => writeOpen(!open)}>
      <Radio aria-hidden className="size-3.5 text-muted-foreground" />
      {open ? "Hide live view" : "Show live view"}
    </Button>
  );
}

// The section itself — hidden until the toggle opens it. The shell is always
// rendered (display:none when closed) with an inline script that un-hides it
// BEFORE first paint when the stored choice says open — otherwise a viewer
// who left it open watched it pop in only after hydration. The chart children
// still mount only once React knows the state, so the pre-paint reveal shows
// the header for a beat before the chart joins — an addition, not a glitch.
export function LiveUsageCollapsible({
  subtitle,
  children,
}: {
  subtitle: string;
  children: React.ReactNode;
}) {
  const open = useLiveViewOpen();

  return (
    <section
      aria-label="Live gateway calls"
      suppressHydrationWarning
      style={open ? undefined : { display: "none" }}
    >
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})==="1")document.currentScript.parentElement.style.display=""}catch(e){}`,
        }}
      />
      <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
        <Radio aria-hidden className="size-3.5 text-muted-foreground" />
        Right now
      </h3>
      <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-3">{open && children}</div>
    </section>
  );
}
