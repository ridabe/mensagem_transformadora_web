import type { MetadataRoute } from "next";

import { buildSiteUrl } from "@/app/api/_shared/slug";

export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  const base = buildSiteUrl();
  const sitemap = base ? `${base}/sitemap.xml` : undefined;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/admin/", "/api/webhooks/"],
      },
    ],
    sitemap,
  };
}
