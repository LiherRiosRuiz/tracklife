import type { APIRoute } from "astro";
import { SITE_URL } from "../config";

// Generated rather than a static public/robots.txt: that file can't read the
// environment, so it advertised the local sitemap URL in production builds.
export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() ?? SITE_URL).replace(/\/$/, "");
  return new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap-index.xml\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};
