import { describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "@/lib/client-ip";

function headers(map: Record<string, string>) {
  return (name: string) => map[name.toLowerCase()] ?? null;
}

describe("clientIpFromHeaders", () => {
  it("prefers X-Real-IP, which nginx sets from $remote_addr", () => {
    const get = headers({
      "x-real-ip": "49.144.111.166",
      "x-forwarded-for": "1.2.3.4, 49.144.111.166",
    });
    expect(clientIpFromHeaders(get)).toBe("49.144.111.166");
  });

  it("ignores a client-supplied CF-Connecting-IP", () => {
    // There is no Cloudflare in the topology and nginx never sets or strips
    // this header, so anyone can send one. It must not win.
    const get = headers({
      "cf-connecting-ip": "8.8.8.8",
      "x-real-ip": "49.144.111.166",
    });
    expect(clientIpFromHeaders(get)).toBe("49.144.111.166");
  });

  it("ignores it even when it is the only header present", () => {
    expect(clientIpFromHeaders(headers({ "cf-connecting-ip": "8.8.8.8" }))).toBeNull();
  });

  it("takes the RIGHT-most X-Forwarded-For entry, the one nginx appended", () => {
    // $proxy_add_x_forwarded_for appends the real peer, so a client that sends
    // "X-Forwarded-For: 1.2.3.4" produces "1.2.3.4, <peer>". The spoof is on
    // the left; the truth is on the right.
    const get = headers({ "x-forwarded-for": "1.2.3.4, 49.144.111.166" });
    expect(clientIpFromHeaders(get)).toBe("49.144.111.166");
  });

  it("trims and handles a single-entry X-Forwarded-For", () => {
    expect(clientIpFromHeaders(headers({ "x-forwarded-for": "  49.144.111.166 " }))).toBe(
      "49.144.111.166",
    );
  });

  it("returns null when nothing usable is present", () => {
    expect(clientIpFromHeaders(headers({}))).toBeNull();
    expect(clientIpFromHeaders(headers({ "x-forwarded-for": " , " }))).toBeNull();
    expect(clientIpFromHeaders(headers({ "x-forwarded-for": "not an ip" }))).toBeNull();
  });

  it("accepts IPv6", () => {
    expect(clientIpFromHeaders(headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });
});
