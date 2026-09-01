import brut from "@/data/catalogue.json";
import type { Catalogue, Produit, Producteur } from "./types";

const catalogue = brut as unknown as Catalogue;

export function getCatalogue(): Catalogue {
  return catalogue;
}

export function getProduits(): Produit[] {
  return catalogue.produits;
}

export function getProduit(id: string): Produit | undefined {
  return catalogue.produits.find((p) => p.id === id);
}

export function getProducteurs(): Producteur[] {
  return catalogue.producteurs;
}

export function getAlternatives(id: string): Produit[] {
  return (catalogue.alternatives[id] ?? [])
    .map((a) => getProduit(a.id))
    .filter((p): p is Produit => Boolean(p));
}

/** Catégories jamais proposées comme produit principal d'un coffret. */
const CATEGORIES_HORS_COFFRET = new Set([
  "COFFRET_ET_EMBALLAGE",
  "ART_DE_LA_TABLE_ET_OBJET",
  "INGREDIENT_PROFESSIONNEL",
]);

export function produitsComposables(): Produit[] {
  return catalogue.produits.filter((p) => !CATEGORIES_HORS_COFFRET.has(p.categorie));
}

/** Produits proposables en extra : objets, cosmétique, petites gourmandises. */
export function produitsExtras(): Produit[] {
  return catalogue.produits.filter(
    (p) =>
      p.categorie === "ART_DE_LA_TABLE_ET_OBJET" ||
      p.categorie === "COSMETIQUE_BIEN_ETRE" ||
      (p.prixVenteHt <= 12 && p.noblesse >= 2),
  );
}
