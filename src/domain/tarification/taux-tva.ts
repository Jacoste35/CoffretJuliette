/**
 * Les taux sont exprimés en points de base : 550 = 5,5 %, 2000 = 20 %.
 * Un entier, donc, pour ne jamais introduire de flottant dans un calcul de
 * TVA.
 *
 * Le taux applicable n'est JAMAIS déduit d'une catégorie de produit : il est
 * porté par le produit lui-même. La confiserie, le chocolat, les margarines
 * et le caviar relèvent du taux normal alors qu'ils sont alimentaires — sur
 * ce catalogue, cela concerne 151 produits, dont les 143 confiseries qui
 * forment la plus grosse catégorie.
 */

export const TAUX_REDUIT_ALIMENTAIRE = 550;
export const TAUX_NORMAL = 2000;

/** Emballage, contenant, personnalisation, port, prestation de composition. */
export const TAUX_PRESTATION = TAUX_NORMAL;

export const BASE_POINTS = 10_000;

export function estTauxValide(tauxBp: number): boolean {
  return Number.isInteger(tauxBp) && tauxBp >= 0 && tauxBp <= BASE_POINTS;
}

export function assertTaux(tauxBp: number): number {
  if (!estTauxValide(tauxBp)) {
    throw new RangeError(
      `taux de TVA invalide : ${tauxBp} (attendu un entier de points de base entre 0 et ${BASE_POINTS})`,
    );
  }
  return tauxBp;
}

export function formaterTaux(tauxBp: number): string {
  return `${(tauxBp / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;
}
