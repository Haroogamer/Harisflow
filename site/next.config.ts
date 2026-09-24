/**
 * next.config.ts — security headers for securenowconsulting.
 *
 * If your project already has a next.config.ts, don't replace it:
 * copy the `securityHeaders` array and the `headers()` function into yours.
 *
 * What these do:
 * - X-Content-Type-Options: stops browsers MIME-sniffing responses into scripts
 * - X-Frame-Options: page can't be embedded in an iframe (clickjacking defense)
 * - Referrer-Policy: only send origin (not full URL) on cross-site navigation
 * - Permissions-Policy: camera/mic/geolocation/payment disabled — the page needs none
 * - Strict-Transport-Security: force HTTPS for 2 years (safe: the site is HTTPS-only)
 * - Content-Security-Policy: only load resources from our own origin.
 *   The page ships zero external scripts/fonts/images, so 'self' is enough.
 *   If you later add analytics or embeds, extend the policy — don't delete it.
 */
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline'", // Tailwind + glass.css inline keyframes
      "img-src 'self' data:",
      "font-src 'self'",
      "script-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
