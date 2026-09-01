import type { MetadataRoute } from "next";
import { getProduits } from "@/lib/catalogue";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://coffret-juliette.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, priority: 1 },
    { url: `${BASE}/catalogue`, priority: 0.9 },
    { url: `${BASE}/questionnaire?t=part`, priority: 0.8 },
    { url: `${BASE}/questionnaire?t=pro`, priority: 0.8 },
    { url: `${BASE}/nos-producteurs`, priority: 0.6 },
    ...getProduits().map((p) => ({ url: `${BASE}/produit/${p.id}`, priority: 0.5 })),
  ];
}
