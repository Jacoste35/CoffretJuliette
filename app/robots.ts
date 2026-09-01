import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/devis"] },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://comptoir-des-chatonniers.vercel.app"}/sitemap.xml`,
  };
}
