import type { NextConfig } from "next";

/**
 * Conservative, well-established headers only — MasterPlan.txt section 17. No
 * Content-Security-Policy yet: getting one right for this app's actual script/style/image
 * sources needs to be tested against a real build, not shipped blind (section 35: never
 * claim something works without testing it) — tracked as a disclosed gap in DATABASE.md.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// Derived from the env var (not hard-coded) so this works against whichever Supabase
// project is active — dev or production — without a code change.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Seed/placeholder product images.
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
