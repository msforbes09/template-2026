"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Lightweight "Live" presence pill for the admin header. Reflects browser
 * connectivity (`navigator.onLine`) — a cheap, honest liveness cue that holds
 * no open connection, unlike the dashboard's SSE/Echo-backed status pills.
 */
export function AdminLiveStatus() {
  // Assume online for the server render and first client paint so hydration
  // matches; the effect corrects it immediately if the browser is offline.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5",
        online
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      {online ? (
        <span aria-hidden className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
      ) : (
        <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/50" />
      )}
      {online ? "Live" : "Offline"}
    </Badge>
  );
}
