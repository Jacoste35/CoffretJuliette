/**
 * Tous les montants du domaine sont des entiers, en centimes.
 * Aucun flottant ne doit approcher un prix : 0,1 + 0,2 !== 0,3.
 */

export type Centimes = number;

export function estCentimesValide(v: number): boolean {
  return Number.isSafeInteger(v);
}

export function assertCentimes(v: number, contexte = 'montant'): Centimes {
  if (!estCentimesValide(v)) {
    throw new TypeError(`${contexte} : ${v} n'est pas un entier de centimes valide`);
  }
  return v;
}

/** Convertit un montant en euros (saisie humaine) vers des centimes. */
export function eurosVersCentimes(euros: number): Centimes {
  if (!Number.isFinite(euros)) {
    throw new TypeError(`montant en euros invalide : ${euros}`);
  }
  return arrondiCommercial(euros * 100);
}

/**
 * Arrondi commercial au centime : à la moitié, on s'éloigne de zéro.
 * Symétrique, pour que les avoirs se comportent comme les factures.
 */
export function arrondiCommercial(v: number): Centimes {
  if (!Number.isFinite(v)) {
    throw new TypeError(`valeur non arrondissable : ${v}`);
  }
  return v < 0 ? -Math.round(-v) : Math.round(v);
}

export function formaterEuros(c: Centimes): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);
}
