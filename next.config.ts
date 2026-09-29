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

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Seed/placeholder product images until Supabase Storage is wired up.
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
