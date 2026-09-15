"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, RotateCcw, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Status = "loading" | "ready" | "error";

// Raw getUserMedia + canvas capture — no third-party dependency needed for
// a plain snapshot, unlike qr-code-scanner.tsx's use of the `qr-scanner`
// package for continuous decode. Lifecycle/error-handling conventions
// (three-state loading/ready/error, NotAllowedError vs. generic failure,
// muted+playsInline for iOS Safari, stream cleanup guarded by a `cancelled`
// flag) mirror that component for consistency.
//
// No `open` prop — FileUploader only mounts this while its capture dialog
// should be visible, so every mount is already a fresh "just opened" state
// (matches account-activation-modal.tsx's remount-to-reset convention for
// its QR scanner, instead of resetting state inside an effect keyed off an
// `open` prop flip).
export function CameraCaptureDialog({
  onOpenChange,
  onCapture,
}: {
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Front camera — this is a selfie-style profile photo, unlike the
        // QR scanner's rear-camera ("environment") default.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Setting srcObject alone doesn't start playback — without an
          // explicit play() (autoPlay isn't reliable when srcObject is
          // assigned imperatively after mount) the element just sits on a
          // blank first frame, rendering solid black despite a live stream.
          await videoRef.current.play().catch(() => {});
        }
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          err instanceof Error && err.name === "NotAllowedError"
            ? "Camera access was denied. Allow camera access in your browser settings to take a photo."
            : "Couldn't access your camera. Check that it isn't in use by another app and try again.",
        );
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // The captured-frame object URL is only ever created in capture() below —
  // revoke it whenever it's replaced or the dialog unmounts, to avoid
  // leaking blob URLs.
  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

  // Retaking swaps the captured <img> back for a <video> — a brand new DOM
  // node, since React can't reuse an <img> as a <video> across renders. The
  // getUserMedia effect above only runs once on mount and won't fire again,
  // so without this the recreated <video> never gets the still-live stream
  // reattached and renders black. A callback ref (rather than the plain
  // videoRef alone) fires on every mount of this element, not just the
  // first, so it re-attaches whenever that happens.
  const attachVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      void node.play().catch(() => {});
    }
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Flip horizontally to match the mirrored live preview below, so the
    // captured photo isn't reversed relative to what was shown.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedFile(new File([blob], "camera-photo.jpg", { type: "image/jpeg" }));
        setCapturedUrl(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.92,
    );
  }

  function retake() {
    setCapturedUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setCapturedFile(null);
  }

  function usePhoto() {
    if (!capturedFile) return;
    onCapture(capturedFile);
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take a photo</DialogTitle>
          <DialogDescription>
            {capturedUrl ? "Review your photo before using it." : "Center your face in the frame."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-lg bg-black">
          {capturedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob: URL, not configured for next/image
            <img
              src={capturedUrl}
              alt="Captured preview"
              className="aspect-square w-full object-cover"
            />
          ) : (
            <video
              ref={attachVideoRef}
              aria-label="Camera preview for taking a profile photo"
              className="aspect-square w-full origin-center scale-x-[-1] object-cover"
              autoPlay
              muted
              playsInline
            />
          )}
          {status === "loading" && !capturedUrl && (
            <div
              aria-live="polite"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white"
            >
              <Loader2 aria-hidden className="size-6 animate-spin" />
              <p className="text-xs">Starting camera…</p>
            </div>
          )}
          {status === "error" && (
            <div
              role="alert"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 p-4 text-center text-white"
            >
              <VideoOff aria-hidden className="size-6" />
              <p className="text-xs leading-relaxed">{errorMessage}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {capturedUrl ? (
            <>
              <Button type="button" variant="outline" className="gap-1.5" onClick={retake}>
                <RotateCcw aria-hidden className="size-3.5" />
                Retake
              </Button>
              <Button type="button" className="gap-1.5" onClick={usePhoto}>
                <Check aria-hidden className="size-3.5" />
                Use photo
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className="gap-1.5"
              disabled={status !== "ready"}
              onClick={capture}
            >
              <Camera aria-hidden className="size-3.5" />
              Capture
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
