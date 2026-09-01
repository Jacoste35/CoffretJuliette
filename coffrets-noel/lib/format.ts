export const euros = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v ?? 0);

export const pourcent = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(v ?? 0);

export const poids = (grammes: number) =>
  grammes >= 1000
    ? `${(grammes / 1000).toFixed(grammes % 1000 === 0 ? 0 : 2)} kg`
    : `${Math.round(grammes)} g`;

export function contenance(p: { poidsNetG: number | null; volumeMl: number | null }) {
  if (p.volumeMl) {
    return p.volumeMl >= 1000
      ? `${+(p.volumeMl / 1000).toFixed(2)} L`
      : `${+(p.volumeMl / 10).toFixed(1)} cl`;
  }
  if (p.poidsNetG) return poids(p.poidsNetG);
  return "";
}

export const LIBELLES_CATEGORIE: Record<string, string> = {
  BISCUITERIE: "Biscuiterie",
  CONFISERIE: "Confiserie",
  EPICERIE_SUCREE: "Épicerie sucrée",
  EPICERIE_SALEE: "Épicerie salée",
  TRAITEUR_SUCRE: "Desserts",
  TRAITEUR_CHARCUTERIE: "Charcuterie & terrines",
  TRAITEUR_MER: "Produits de la mer",
  TRAITEUR_PLATS: "Plats cuisinés",
  BOISSON_SANS_ALCOOL: "Boissons sans alcool",
  BOISSON_ALCOOLISEE: "Boissons alcoolisées",
  COSMETIQUE_BIEN_ETRE: "Bien-être",
  ART_DE_LA_TABLE_ET_OBJET: "Art de la table",
  COFFRET_ET_EMBALLAGE: "Coffrets",
  INGREDIENT_PROFESSIONNEL: "Usage professionnel",
};

export const libelleCategorie = (c: string) => LIBELLES_CATEGORIE[c] ?? c;
