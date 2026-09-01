import { getProduits } from "./catalogue";
import type { Produit } from "./types";

export interface FiltresCatalogue {
  q: string;
  categorie: string;
  alcool: string;
  departement: string;
  producteur: string;
  tri: string;
  page: number;
}

export const PAR_PAGE = 24;

const sansAccent = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function lireFiltres(params: Record<string, string | string[] | undefined>): FiltresCatalogue {
  const lire = (cle: string) => {
    const v = params[cle];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const page = Number(lire("page"));
  return {
    q: lire("q"),
    categorie: lire("c"),
    alcool: lire("a"),
    departement: lire("d"),
    producteur: lire("prod"),
    tri: lire("tri") || "nom",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

export function filtrer(filtres: FiltresCatalogue) {
  const recherche = sansAccent(filtres.q.trim());

  let resultats = getProduits().filter((p) => {
    if (filtres.categorie && p.categorie !== filtres.categorie) return false;
    if (filtres.departement && p.departement !== filtres.departement) return false;
    if (filtres.producteur && p.producteur !== filtres.producteur) return false;
    if (filtres.alcool === "SANS" && p.alcool !== "NON") return false;
    if (filtres.alcool === "AVEC" && p.alcool !== "OUI") return false;
    if (filtres.alcool === "INGREDIENT" && p.alcool !== "INGREDIENT_ALCOOLISE") return false;
    if (filtres.alcool === "LOCAL" && p.alerteMatierePremiere) return false;
    if (recherche) {
      const champs = sansAccent(
        `${p.nom} ${p.producteur} ${p.producteurVille} ${p.sousCategorie} ${p.appellation}`,
      );
      if (!recherche.split(/\s+/).every((mot) => champs.includes(mot))) return false;
    }
    return true;
  });

  const comparateurs: Record<string, (a: Produit, b: Produit) => number> = {
    nom: (a, b) => a.nom.localeCompare(b.nom, "fr"),
    "prix-croissant": (a, b) => a.prixVenteHt - b.prixVenteHt,
    "prix-decroissant": (a, b) => b.prixVenteHt - a.prixVenteHt,
    producteur: (a, b) => a.producteur.localeCompare(b.producteur, "fr") || a.nom.localeCompare(b.nom, "fr"),
    noblesse: (a, b) => b.noblesse - a.noblesse || a.nom.localeCompare(b.nom, "fr"),
  };
  resultats = [...resultats].sort(comparateurs[filtres.tri] ?? comparateurs.nom);

  const total = resultats.length;
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const page = Math.min(filtres.page, pages);
  return {
    total,
    pages,
    page,
    produits: resultats.slice((page - 1) * PAR_PAGE, page * PAR_PAGE),
  };
}

/** Valeurs de filtres réellement présentes dans le catalogue. */
export function facettes() {
  const produits = getProduits();
  const compter = (cle: (p: Produit) => string) => {
    const map = new Map<string, number>();
    produits.forEach((p) => {
      const v = cle(p);
      if (v) map.set(v, (map.get(v) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  return {
    categories: compter((p) => p.categorie),
    departements: compter((p) => p.departement).sort((a, b) => a[0].localeCompare(b[0], "fr")),
    producteurs: compter((p) => p.producteur).sort((a, b) => a[0].localeCompare(b[0], "fr")),
  };
}
