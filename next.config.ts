import type { NextConfig } from "next";

/**
 * The page Content-Security-Policy lives in src/proxy.ts, not here — it embeds
 * a per-request nonce, which a static config header cannot produce.
 *
 * This file carries the headers that are genuinely per-deployment constants,
 * plus a standalone CSP for the one route proxy.ts deliberately skips.
 */

// /api/auth/apple/callback returns hand-written HTML containing a static
// <script src="https://appleid.cdn-apple.com/...">. It is not rendered by
// Next.js, so it never receives a nonce, and the page policy's
// 'strict-dynamic' would block it. Scope a minimal policy to just this route.
const APPLE_CALLBACK_CSP = [
  "default-src 'none'",
  "script-src https://appleid.cdn-apple.com",
  "connect-src https://appleid.apple.com",
  "frame-ancestors 'none'",
  "base-uri 'none'",
].join("; ");

const SECURITY_HEADERS = [
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    // 'preload' is intentionally omitted. Submitting to the browser preload
    // list is baked into browser binaries and takes months to reverse — it is
    // a commitment to serve every subdomain over HTTPS forever, not a header
    // tweak. Add it only as a deliberate, separate decision.
    //
    // includeSubDomains still requires that every current and future subdomain
    // (staging, marketing, mail) is HTTPS-only. Drop it if that isn't true.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) so CI can build once and
  // ship it to the VPS without node_modules; run with `node server.js`.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/api/auth/apple/callback",
        headers: [
          {
            key: "Content-Security-Policy",
            value: APPLE_CALLBACK_CSP,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
