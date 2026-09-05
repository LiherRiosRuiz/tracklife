import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://app.tracklife.test";

  return [
    { url: `${baseUrl}/login`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/registro`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
