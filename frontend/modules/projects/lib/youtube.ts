// The API accepts a demo video only from YouTube (https, host on the allowed
// list: youtube.com, www.youtube.com, youtu.be), so the form validates
// against the same list the backend does rather than letting a wrong host
// round-trip to a 422 — and the public page can embed with confidence.

const ALLOWED_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"] as const;

// m.youtube.com isn't on the backend's list, so it's accepted for *parsing*
// (an already-stored URL still embeds) but not for submission.
const SUBMITTABLE_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be"] as const;

export function isYouTubeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (SUBMITTABLE_HOSTS as readonly string[]).includes(url.hostname)
    );
  } catch {
    return false;
  }
}

// The 11-character video id, or null when the URL isn't a recognisable
// YouTube video link. Handles the three shapes the allowed hosts produce:
// /watch?v=ID, youtu.be/ID, and /embed/ID (plus /shorts/ID and /live/ID,
// which are the same video under a different path).
export function youTubeVideoId(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!(ALLOWED_HOSTS as readonly string[]).includes(url.hostname)) return null;

  const id =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/)?.[1] ??
        null;

  // YouTube ids are exactly 11 chars of [A-Za-z0-9_-]; anything else is a
  // channel/playlist URL that would embed as an error frame.
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

// Privacy-preserving host: youtube-nocookie.com doesn't set tracking cookies
// until the visitor actually plays the video, which matters on a government
// site that lists no cookie banner.
export function youTubeEmbedUrl(value: string): string | null {
  const id = youTubeVideoId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function youTubeThumbnailUrl(value: string): string | null {
  const id = youTubeVideoId(value);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
