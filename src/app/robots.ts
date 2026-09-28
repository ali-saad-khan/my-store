import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/account",
        "/account/",
        "/checkout",
        "/cart",
        "/orders/",
        "/login",
        "/register",
        "/forgot-password",
        "/update-password",
        "/auth/",
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
