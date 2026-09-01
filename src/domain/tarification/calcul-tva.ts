import { arrondiCommercial, assertCentimes, type Centimes } from './centimes';
import { assertTaux, BASE_POINTS } from './taux-tva';

/**
 * Calcul de TVA ligne à ligne.
 *
 * Deux règles structurent tout ce fichier :
 *
 *  1. La base est cumulée PAR TAUX, puis la TVA est arrondie une seule fois
 *     sur ce sous-total. Arrondir chaque ligne ferait dériver le total de
 *     quelques centimes sur un coffret de dix produits.
 *  2. Une remise globale est ventilée proportionnellement sur les bases de
 *     chaque taux. Une remise appliquée après coup sur le total fausse la
 *     TVA — c'est la façon la plus courante de se tromper sur un coffret
 *     mixte 5,5 / 20.
 */

export interface LigneTaxable {
  readonly libelle: string;
  /** Négative pour un avoir. */
  readonly quantite: number;
  /** En centimes, hors taxe, pour une unité. Toujours positif. */
  readonly prixUnitaireHtCentimes: Centimes;
  /** En points de base : 550 = 5,5 %. */
  readonly tauxBp: number;
}

export interface VentilationTaux {
  readonly tauxBp: number;
  readonly baseHtCentimes: Centimes;
  readonly tvaCentimes: Centimes;
  readonly totalTtcCentimes: Centimes;
}

export interface Totaux {
  /** Une entrée par taux présent, triée par taux croissant. */
  readonly ventilation: readonly VentilationTaux[];
  readonly totalHtCentimes: Centimes;
  readonly totalTvaCentimes: Centimes;
  readonly totalTtcCentimes: Centimes;
  /** Remise effectivement appliquée, ventilée. */
  readonly remiseCentimes: Centimes;
}

export interface OptionsCalcul {
  /** Remise commerciale globale, en centimes, positive. */
  readonly remiseCentimes?: Centimes;
}

function valider(ligne: LigneTaxable, index: number): void {
  const ou = `ligne ${index} (« ${ligne.libelle} »)`;
  if (!Number.isSafeInteger(ligne.quantite)) {
    throw new TypeError(`${ou} : quantité non entière (${ligne.quantite})`);
  }
  assertCentimes(ligne.prixUnitaireHtCentimes, `${ou} : prix unitaire`);
  if (ligne.prixUnitaireHtCentimes < 0) {
    throw new RangeError(
      `${ou} : prix unitaire négatif. Pour un avoir, utilisez une quantité négative.`,
    );
  }
  assertTaux(ligne.tauxBp);
}

/**
 * Répartit un montant sur des poids, sans perdre ni inventer de centime.
 * Méthode du plus fort reste : les centimes non attribués par la division
 * entière vont aux parts dont le reste est le plus élevé.
 */
function repartirProportionnellement(montant: Centimes, poids: readonly number[]): Centimes[] {
  const total = poids.reduce((s, p) => s + p, 0);
  if (total === 0 || montant === 0) return poids.map(() => 0);

  const exacts = poids.map((p) => (montant * p) / total);
  const parts = exacts.map((v) => Math.trunc(v));
  let reste = montant - parts.reduce((s, p) => s + p, 0);

  const ordre = exacts
    .map((v, i) => ({ i, frac: Math.abs(v - Math.trunc(v)) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const pas = reste >= 0 ? 1 : -1;
  for (let k = 0; reste !== 0 && k < ordre.length * 2; k++) {
    const cible = ordre[k % ordre.length];
    if (cible === undefined) break;
    parts[cible.i] = (parts[cible.i] ?? 0) + pas;
    reste -= pas;
  }
  return parts;
}

export function calculerTotaux(
  lignes: readonly LigneTaxable[],
  options: OptionsCalcul = {},
): Totaux {
  lignes.forEach(valider);

  const remiseDemandee = options.remiseCentimes ?? 0;
  assertCentimes(remiseDemandee, 'remise');
  if (remiseDemandee < 0) {
    throw new RangeError(`remise négative (${remiseDemandee}) : une remise se donne en positif`);
  }

  // 1. Base hors taxe cumulée par taux.
  const bases = new Map<number, Centimes>();
  for (const l of lignes) {
    const base = l.prixUnitaireHtCentimes * l.quantite;
    bases.set(l.tauxBp, (bases.get(l.tauxBp) ?? 0) + base);
  }

  const taux = [...bases.keys()].sort((a, b) => a - b);
  const basesBrutes = taux.map((t) => bases.get(t) ?? 0);
  const totalBrut = basesBrutes.reduce((s, b) => s + b, 0);

  // 2. Ventilation de la remise, proportionnellement aux bases.
  //    On ne remise jamais plus que le total : sinon la facture passerait
  //    en négatif sans qu'un avoir ait été émis.
  const remise = Math.min(remiseDemandee, Math.max(totalBrut, 0));
  const remises = repartirProportionnellement(remise, basesBrutes);

  // 3. TVA arrondie une seule fois, sur le sous-total de chaque taux.
  const ventilation: VentilationTaux[] = taux.map((tauxBp, i) => {
    const baseHtCentimes = (basesBrutes[i] ?? 0) - (remises[i] ?? 0);
    const tvaCentimes = arrondiCommercial((baseHtCentimes * tauxBp) / BASE_POINTS);
    return {
      tauxBp,
      baseHtCentimes,
      tvaCentimes,
      totalTtcCentimes: baseHtCentimes + tvaCentimes,
    };
  });

  const totalHtCentimes = ventilation.reduce((s, v) => s + v.baseHtCentimes, 0);
  const totalTvaCentimes = ventilation.reduce((s, v) => s + v.tvaCentimes, 0);

  return {
    ventilation,
    totalHtCentimes,
    totalTvaCentimes,
    totalTtcCentimes: totalHtCentimes + totalTvaCentimes,
    remiseCentimes: remise,
  };
}

/**
 * Acompte : sa TVA suit la ventilation de la commande, elle ne se calcule pas
 * à un taux moyen. Le solde est le complément exact, au centime près.
 */
export function calculerAcompte(totaux: Totaux, pourcentageBp: number): Totaux {
  if (!Number.isInteger(pourcentageBp) || pourcentageBp < 0 || pourcentageBp > BASE_POINTS) {
    throw new RangeError(`pourcentage d'acompte invalide : ${pourcentageBp}`);
  }

  const ventilation: VentilationTaux[] = totaux.ventilation.map((v) => {
    const baseHtCentimes = arrondiCommercial((v.baseHtCentimes * pourcentageBp) / BASE_POINTS);
    const tvaCentimes = arrondiCommercial((baseHtCentimes * v.tauxBp) / BASE_POINTS);
    return { tauxBp: v.tauxBp, baseHtCentimes, tvaCentimes, totalTtcCentimes: baseHtCentimes + tvaCentimes };
  });

  const totalHtCentimes = ventilation.reduce((s, v) => s + v.baseHtCentimes, 0);
  const totalTvaCentimes = ventilation.reduce((s, v) => s + v.tvaCentimes, 0);

  return {
    ventilation,
    totalHtCentimes,
    totalTvaCentimes,
    totalTtcCentimes: totalHtCentimes + totalTvaCentimes,
    remiseCentimes: 0,
  };
}

/** Le solde restant dû après un acompte. Complément exact, jamais recalculé. */
export function calculerSolde(commande: Totaux, acompte: Totaux): Totaux {
  const parTaux = new Map(acompte.ventilation.map((v) => [v.tauxBp, v]));

  const ventilation: VentilationTaux[] = commande.ventilation.map((v) => {
    const a = parTaux.get(v.tauxBp);
    const baseHtCentimes = v.baseHtCentimes - (a?.baseHtCentimes ?? 0);
    const tvaCentimes = v.tvaCentimes - (a?.tvaCentimes ?? 0);
    return { tauxBp: v.tauxBp, baseHtCentimes, tvaCentimes, totalTtcCentimes: baseHtCentimes + tvaCentimes };
  });

  const totalHtCentimes = ventilation.reduce((s, v) => s + v.baseHtCentimes, 0);
  const totalTvaCentimes = ventilation.reduce((s, v) => s + v.tvaCentimes, 0);

  return {
    ventilation,
    totalHtCentimes,
    totalTvaCentimes,
    totalTtcCentimes: totalHtCentimes + totalTvaCentimes,
    remiseCentimes: 0,
  };
}
