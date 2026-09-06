import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://app.tracklife.test";

  return {
    rules: {
      userAgent: "*",
      disallow: ["/app/", "/api/", "/onboarding"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
