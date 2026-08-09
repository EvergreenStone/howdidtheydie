import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/sign-in",
        "/sign-up",
        "/submission-received",
        "/analysis-submission-received",
        "/source-submission-received",
        "/correction-submission-received",
      ],
    },
    sitemap: "https://howdidtheydie.org/sitemap.xml",
    host: "https://howdidtheydie.org",
  };
}
