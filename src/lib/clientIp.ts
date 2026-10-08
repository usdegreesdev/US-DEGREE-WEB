import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/**
 * Server-only. Forwards the visitor's real IP to the backend so its rate
 * limits key on the visitor, not on this server's egress address.
 *
 * X-Proxy-Signature = HMAC-SHA256(ip, PROXY_IP_SECRET), hex. The secret proves
 * the IP came from us rather than from a client; it carries no data access.
 */

export const CLIENT_IP_HEADER = "X-Client-IP";
export const PROXY_SIGNATURE_HEADER = "X-Proxy-Signature";

/** Headers that must never be taken from the browser. */
export const STRIPPED_CLIENT_HEADERS = [
  CLIENT_IP_HEADER,
  PROXY_SIGNATURE_HEADER,
] as const;

/**
 * Which x-forwarded-for entry is the visitor. Depends on the host, because
 * x-forwarded-for is client-controllable up to the first trusted proxy:
 *
 * - Vercel (the assumed host — NEXT_PUBLIC_SITE_URL is a vercel.app origin):
 *   the platform overwrites any client-supplied x-forwarded-for, so the FIRST
 *   hop is the visitor. This is the default (TRUSTED_PROXY_HOPS unset/0).
 * - Any other host: a client can prepend arbitrary entries, so the first hop
 *   is spoofable. Set TRUSTED_PROXY_HOPS=N, the number of proxies in front of
 *   this server that each append the address they saw (1 for a single load
 *   balancer). The visitor is then the Nth entry from the RIGHT, which only
 *   trusted proxies wrote. With fewer than N entries nothing is trusted and
 *   no IP is forwarded.
 */
function trustedHops(): number {
  const n = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function getClientIp(headers: Headers): string | null {
  const parts = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const hops = trustedHops();
  let candidate = "";
  if (hops === 0) {
    candidate = parts[0] ?? headers.get("x-real-ip")?.trim() ?? "";
  } else if (parts.length >= hops) {
    candidate = parts[parts.length - hops];
  }
  return isIP(candidate) ? candidate : null;
}

let warnedMissingSecret = false;

/**
 * Headers to attach to a backend request. Returns {} (so the backend falls
 * back to our egress IP) when the IP is unknown or PROXY_IP_SECRET is unset.
 */
export function clientIpHeaders(incoming: Headers): Record<string, string> {
  const ip = getClientIp(incoming);
  if (!ip) return {};

  const secret = process.env.PROXY_IP_SECRET;
  if (!secret) {
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.error(
        "[clientIp] PROXY_IP_SECRET is not set — client IP is not being " +
          "forwarded, so the backend will rate-limit all visitors as one.",
      );
    }
    return {};
  }

  return {
    [CLIENT_IP_HEADER]: ip,
    [PROXY_SIGNATURE_HEADER]: createHmac("sha256", secret)
      .update(ip)
      .digest("hex"),
  };
}
