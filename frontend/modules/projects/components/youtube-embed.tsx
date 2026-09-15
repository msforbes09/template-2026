import { CirclePlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { youTubeEmbedUrl } from "@/modules/projects/lib/youtube";

// The API only accepts YouTube links, so the demo video is always embeddable.
// A stored URL that doesn't resolve to a single video (a channel or playlist
// slipped past an older validation) falls back to a plain link rather than an
// iframe that would render YouTube's error page inside the layout.
export function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const embedUrl = youTubeEmbedUrl(url);

  if (!embedUrl) {
    return (
      <Button
        variant="outline"
        nativeButton={false}
        className="gap-1.5"
        render={<a href={url} target="_blank" rel="noreferrer noopener" />}
      >
        <CirclePlay aria-hidden className="size-4" />
        Watch the demo on YouTube
      </Button>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black">
      <iframe
        src={embedUrl}
        title={`${title} — demo video`}
        // Only what a YouTube player needs; no camera, microphone or payment.
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="aspect-video w-full"
      />
    </div>
  );
}
