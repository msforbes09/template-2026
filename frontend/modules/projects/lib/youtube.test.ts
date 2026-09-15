import { describe, expect, it } from "vitest";
import {
  isYouTubeUrl,
  youTubeEmbedUrl,
  youTubeThumbnailUrl,
  youTubeVideoId,
} from "@/modules/projects/lib/youtube";

describe("isYouTubeUrl", () => {
  it("accepts the three hosts the API allows, over https", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("rejects http, other hosts and malformed input", () => {
    expect(isYouTubeUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
    expect(isYouTubeUrl("https://vimeo.com/12345")).toBe(false);
    expect(isYouTubeUrl("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ")).toBe(false);
    expect(isYouTubeUrl("not a url")).toBe(false);
    expect(isYouTubeUrl("")).toBe(false);
  });
});

describe("youTubeVideoId", () => {
  it("reads the id from every shape the allowed hosts produce", () => {
    expect(youTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youTubeVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("keeps extra query params out of the id", () => {
    expect(youTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s")).toBe("dQw4w9WgXcQ");
    expect(youTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=42")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for links that aren't a single video", () => {
    expect(youTubeVideoId("https://www.youtube.com/@egovph")).toBeNull();
    expect(youTubeVideoId("https://www.youtube.com/playlist?list=PL1234567890")).toBeNull();
    expect(youTubeVideoId("https://vimeo.com/12345")).toBeNull();
    expect(youTubeVideoId("nope")).toBeNull();
  });
});

describe("youTubeEmbedUrl", () => {
  it("builds a nocookie embed URL", () => {
    expect(youTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  it("returns null when there's no video to embed", () => {
    expect(youTubeEmbedUrl("https://www.youtube.com/@egovph")).toBeNull();
  });
});

describe("youTubeThumbnailUrl", () => {
  it("builds a thumbnail URL for a valid video", () => {
    expect(youTubeThumbnailUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });
});
