// The browser's address as seen by this Next.js server, for forwarding to the
// WS on server-side API calls (server actions, RSC reads). Without it the WS
// attributes every such call to the UI server itself — logout and credential
// audits all showed the UI host's egress IP.
//
// Pure: takes a header getter so it's testable and independent of next/headers.
//
// ONLY reads headers the trusted edge sets itself.
//
// The previous order preferred `cf-connecting-ip`, then the LEFT-MOST entry of
// `x-forwarded-for`. Both are attacker-controlled in the shipped topology:
// nginx.conf never sets or strips CF-Connecting-IP (there is no Cloudflare in
// front), so any client can simply send one; and X-Forwarded-For is built with
// $proxy_add_x_forwarded_for, which APPENDS the real peer to whatever arrived,
// leaving index 0 as the caller's own string. The value then went out as
// X-Forwarded-For on every authenticated backend call, so the IP recorded
// against credential generation, project publication and logout was whatever
// the caller chose — the opposite of the non-repudiation this file exists for.
//
// X-Real-IP is set from $remote_addr, the TCP peer as nginx observed it, which
// no client can forge. It is therefore the only candidate read by default.
//
// The right-most X-Forwarded-For entry is the fallback: with
// $proxy_add_x_forwarded_for the peer is appended last, so the final entry has
// the same provenance as X-Real-IP. Anything a client sends lands to its left
// and is ignored.

// Loose shape check — just enough to drop garbage, not a validator. The WS
// walks its own trusted chain and never trusts this value blindly.
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

function looksLikeIp(value: string): boolean {
  return IPV4.test(value) || (value.includes(":") && IPV6.test(value));
}

export function clientIpFromHeaders(get: (name: string) => string | null): string | null {
  const forwarded = get("x-forwarded-for")?.split(",");
  const candidates = [
    // Set by nginx from $remote_addr — not forwardable by a client.
    get("x-real-ip"),
    // Right-most, NOT left-most: the entry the trusted proxy appended.
    forwarded?.[forwarded.length - 1],
  ];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (value && looksLikeIp(value)) return value;
  }
  return null;
}
