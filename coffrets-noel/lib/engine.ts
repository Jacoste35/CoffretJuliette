import { produitsComposables, getAlternatives } from "./catalogue";
import {
  EMBALLAGES,
  PREPARATION,
  PROTECTION_PAR_PRODUIT_FRAGILE_HT,
  POIDS_PROTECTION_G,
  POIDS_CARTON_EXPEDITION_G,
  POIDS_MAX_COLIS_KG,
  REMISES_QUANTITE,
  TRANSPORT,
  TVA_EMBALLAGE,
  TVA_TRANSPORT,
} from "./parametres";
import type {
  Besoin,
  Chiffrage,
  Devis,
  Gamme,
  LigneCommande,
  Produit,
  Proposition,
} from "./types";

/* -------------------------------------------------------------------------
 * Structure des trois gammes.
 * Le squelette décrit ce que doit contenir un coffret, pas quels produits :
 * les produits sont choisis dans le catalogue réel par le scoring ci-dessous.
 * ---------------------------------------------------------------------- */
interface Squelette {
  gamme: Gamme;
  libelle: string;
  accroche: string;
  nbProduits: number;
  /** Familles à couvrir, dans l'ordre de remplissage. */
  familles: string[][];
  /** Part du budget visée par rapport au budget annoncé par le client. */
  cibleBudget: number;
  noblesseMin: number;
  /** Au moins un produit de ce niveau de noblesse (pièce maîtresse). */
  pieceMaitresse?: number;
}

const SUCRE = ["EPICERIE_SUCREE", "CONFISERIE", "BISCUITERIE", "TRAITEUR_SUCRE"];
const SALE = ["EPICERIE_SALEE", "TRAITEUR_CHARCUTERIE", "TRAITEUR_MER", "TRAITEUR_PLATS"];
const BOISSON = ["BOISSON_ALCOOLISEE", "BOISSON_SANS_ALCOOL"];

export const SQUELETTES: Squelette[] = [
  {
    gamme: "ESSENTIEL",
    libelle: "Essentiel",
    accroche: "L'essentiel du terroir normand, joliment présenté",
    nbProduits: 3,
    familles: [BOISSON, SUCRE, SALE],
    cibleBudget: 0.86,
    noblesseMin: 1,
  },
  {
    gamme: "SIGNATURE",
    libelle: "Signature",
    accroche: "Notre sélection la plus équilibrée — la plus choisie",
    nbProduits: 4,
    familles: [BOISSON, SUCRE, SALE, [...SUCRE, ...SALE]],
    cibleBudget: 1.0,
    noblesseMin: 2,
    pieceMaitresse: 3,
  },
  {
    gamme: "PRESTIGE",
    libelle: "Prestige",
    accroche: "Une pièce maîtresse et des produits d'exception",
    nbProduits: 5,
    familles: [BOISSON, SUCRE, SALE, [...SUCRE, ...SALE], [...BOISSON, ...SUCRE, ...SALE]],
    cibleBudget: 1.22,
    noblesseMin: 2,
    pieceMaitresse: 4,
  },
];

/* -------------------------------------------------------------------------
 * Scoring de pertinence.
 * La marge n'intervient qu'en dernier critère, pour départager deux produits
 * également pertinents — jamais pour imposer un produit incohérent.
 * ---------------------------------------------------------------------- */
export function scorePertinence(p: Produit, besoin: Besoin, dejaProposes?: Set<string>): number {
  let score = 0;

  // Les trois offres doivent se distinguer : un produit déjà retenu dans une
  // gamme précédente est légèrement pénalisé dans les suivantes.
  if (dejaProposes?.has(p.id)) score -= 14;

  // Qualité perçue
  score += p.noblesse * 10;

  // Ancrage local : tous nos produits sont normands, on valorise ceux dont la
  // matière première l'est aussi.
  if (!p.alerteMatierePremiere) score += 8;
  if (p.appellation) score += 12;

  // Préférences exprimées
  if (besoin.preferences.includes("LOCAL") && !p.alerteMatierePremiere) score += 14;
  if (besoin.preferences.includes("GOURMAND") && SUCRE.includes(p.categorie)) score += 10;
  if (besoin.preferences.includes("SALE") && SALE.includes(p.categorie)) score += 10;
  if (besoin.preferences.includes("PREMIUM")) score += p.noblesse * 6;
  if (besoin.preferences.includes("BIEN_ETRE") && p.categorie === "COSMETIQUE_BIEN_ETRE") score += 16;

  if (besoin.occasion === "NOEL" && p.produitNoel) score += 10;

  // Modes de préférence
  if (besoin.priorite === "QUALITE") score += p.noblesse * 8;
  if (besoin.priorite === "VALEUR_PERCUE") {
    score += p.noblesse * 6;
    if (p.contientVerre) score += 4; // un contenant verre « fait cadeau »
  }
  if (besoin.priorite === "BUDGET") score -= p.prixVenteHt * 0.5;

  // Logistique : à pertinence égale, on préfère ce qui coûte moins cher à expédier
  if (p.poidsNetG && p.poidsNetG <= 300 && !p.fragile) score += 3;
  if (p.poidsNetG && p.poidsNetG >= 1000) score -= 4;

  // Marge : dernier critère, pondération volontairement faible
  score += (p.tauxMarge ?? 0) * 6;

  return score;
}

function respecteRegimeAlcool(p: Produit, regime: Besoin["alcool"]): boolean {
  if (regime === "SANS") return p.alcool === "NON";
  if (regime === "AVEC") return true;
  return true;
}

/* -------------------------------------------------------------------------
 * Composition d'un coffret
 * ---------------------------------------------------------------------- */
/** Prix de vente plancher retenu pour réserver le budget des autres emplacements. */
const PRIX_PLANCHER_PRODUIT = 3.5;

/** Part maximale du prix du coffret que peut représenter l'emballage. */
const PART_MAX_EMBALLAGE = 0.22;

const ORDRE_EMBALLAGES: Gamme[] = ["PRESTIGE", "SIGNATURE", "ESSENTIEL"];

/**
 * Choisit l'emballage réellement adapté au coffret.
 *
 * L'emballage de la gamme est le choix par défaut, mais il n'a de sens que
 * s'il reste proportionné : un coffret à 30 € ne peut pas partir dans une
 * boîte prestige à 16 €, il ne resterait plus rien pour les produits. On
 * descend alors d'un cran, ce qui reste cohérent pour le client.
 */
export function emballagePour(gamme: Gamme, budget: number) {
  const cible = budget * (SQUELETTES.find((s) => s.gamme === gamme)?.cibleBudget ?? 1);
  const depart = ORDRE_EMBALLAGES.indexOf(gamme);
  for (let i = depart; i < ORDRE_EMBALLAGES.length; i += 1) {
    const cle = ORDRE_EMBALLAGES[i];
    if (EMBALLAGES[cle].prixVenteHt <= cible * PART_MAX_EMBALLAGE) {
      return { cle, parametre: EMBALLAGES[cle] };
    }
  }
  const cle = ORDRE_EMBALLAGES[ORDRE_EMBALLAGES.length - 1];
  return { cle, parametre: EMBALLAGES[cle] };
}

const total = (produits: Produit[]) => produits.reduce((s, p) => s + p.prixVenteHt, 0);

/**
 * Compose un coffret complet.
 *
 * Le remplissage glouton peut laisser un emplacement vide : un produit très
 * bien noté consomme sa part et un peu de celle des suivants, et de proche en
 * proche il ne reste plus rien pour le dernier. Plutôt que de livrer un
 * coffret incomplet, on rejoue la composition avec un plafond par emplacement
 * de plus en plus strict, et on garde la première tentative complète.
 */
function composer(
  squelette: Squelette,
  besoin: Besoin,
  pool: Produit[],
  dejaProposes: Set<string>,
): Produit[] {
  let meilleure: Produit[] = [];
  for (const facteurPlafond of [1.7, 1.3, 1.05]) {
    const essai = composerAvecPlafond(squelette, besoin, pool, dejaProposes, facteurPlafond);
    if (essai.length > meilleure.length) meilleure = essai;
    if (essai.length === squelette.nbProduits) break;
  }
  return ajusterAuBudget(
    meilleure,
    besoin,
    pool,
    enveloppeProduits(squelette, besoin),
    dejaProposes,
  );
}

function enveloppeProduits(squelette: Squelette, besoin: Besoin): number {
  const cible = besoin.budget * squelette.cibleBudget;
  const emballage = emballagePour(squelette.gamme, besoin.budget).parametre;
  return Math.max(cible - emballage.prixVenteHt, cible * 0.55);
}

function composerAvecPlafond(
  squelette: Squelette,
  besoin: Besoin,
  pool: Produit[],
  dejaProposes: Set<string>,
  facteurPlafond: number,
): Produit[] {
  const enveloppe = enveloppeProduits(squelette, besoin);

  const choisis: Produit[] = [];
  const sousCategoriesPrises = new Set<string>();
  const producteursPris = new Set<string>();

  // Ordre de remplissage : la pièce maîtresse d'abord. C'est elle qui structure
  // le coffret et consomme la plus grosse part du budget ; la remplir en dernier
  // revient à ne plus rien pouvoir y mettre.
  const emplacements = squelette.familles.map((familles, index) => ({
    familles,
    maitresse: squelette.pieceMaitresse !== undefined && index === squelette.familles.length - 1,
  }));
  emplacements.sort((a, b) => Number(b.maitresse) - Number(a.maitresse));

  emplacements.forEach((emplacement, rang) => {
    const restants = emplacements.length - rang;
    const disponible = enveloppe - total(choisis);
    const partEquitable = disponible / restants;
    // Deux garde-fous : réserver de quoi remplir les emplacements suivants, et
    // empêcher un emplacement de consommer la part des autres. Sans ce second
    // plafond, un produit très bien noté vide le budget et le coffret se
    // retrouve incomplet.
    const plafond = Math.min(
      disponible - (restants - 1) * PRIX_PLANCHER_PRODUIT,
      emplacement.maitresse ? disponible * 0.55 : partEquitable * facteurPlafond,
    );
    if (plafond <= 0) return;

    const cibleEmplacement = emplacement.maitresse
      ? Math.min(disponible * 0.42, plafond)
      : partEquitable;

    const compatibles = pool.filter(
      (p) =>
        emplacement.familles.includes(p.categorie) &&
        !sousCategoriesPrises.has(p.sousCategorie) &&
        p.prixVenteHt <= plafond,
    );
    if (!compatibles.length) return;

    // Le niveau de noblesse est un objectif, pas un blocage : si aucun produit
    // ne l'atteint dans le budget restant, on retombe sur le niveau de base
    // plutôt que de livrer un coffret incomplet.
    const seuil = emplacement.maitresse ? squelette.pieceMaitresse! : squelette.noblesseMin;
    const candidats =
      compatibles.filter((p) => p.noblesse >= seuil).length > 0
        ? compatibles.filter((p) => p.noblesse >= seuil)
        : compatibles.filter((p) => p.noblesse >= squelette.noblesseMin).length > 0
          ? compatibles.filter((p) => p.noblesse >= squelette.noblesseMin)
          : compatibles;

    const note = (p: Produit) =>
      scorePertinence(p, besoin, dejaProposes) -
      Math.abs(p.prixVenteHt - cibleEmplacement) * 3 -
      (producteursPris.has(p.producteur) ? 12 : 0);

    const meilleur = candidats.reduce((a, b) => {
      const na = note(a);
      const nb = note(b);
      if (nb > na) return b;
      if (nb < na) return a;
      return a.id <= b.id ? a : b; // départage stable
    });

    choisis.push(meilleur);
    sousCategoriesPrises.add(meilleur.sousCategorie);
    producteursPris.add(meilleur.producteur);
  });

  return choisis;
}

/**
 * Rapproche la composition de l'enveloppe sans jamais la dépasser : on monte
 * en gamme un produit à la fois, en restant dans la même sous-catégorie pour
 * ne pas dénaturer le coffret. Un coffret à 37 € pour un budget de 45 € est
 * une occasion manquée pour le client comme pour la marge.
 */
function ajusterAuBudget(
  choisis: Produit[],
  besoin: Besoin,
  pool: Produit[],
  enveloppe: number,
  dejaProposes: Set<string>,
): Produit[] {
  let courants = [...choisis];

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const somme = total(courants);
    if (somme >= enveloppe * 0.94) break;

    let meilleurEchange: { index: number; produit: Produit; gain: number } | null = null;

    courants.forEach((produit, index) => {
      const remplacants = pool.filter(
        (p) =>
          p.sousCategorie === produit.sousCategorie &&
          p.id !== produit.id &&
          !courants.some((c) => c.id === p.id) &&
          p.prixVenteHt > produit.prixVenteHt &&
          somme - produit.prixVenteHt + p.prixVenteHt <= enveloppe,
      );
      remplacants.forEach((p) => {
        const gain =
          (p.prixVenteHt - produit.prixVenteHt) * 2 +
          (scorePertinence(p, besoin, dejaProposes) -
            scorePertinence(produit, besoin, dejaProposes));
        if (!meilleurEchange || gain > meilleurEchange.gain) {
          meilleurEchange = { index, produit: p, gain };
        }
      });
    });

    if (!meilleurEchange) break;
    const echange: { index: number; produit: Produit } = meilleurEchange;
    courants = courants.map((p, i) => (i === echange.index ? echange.produit : p));
  }

  return courants;
}

/* -------------------------------------------------------------------------
 * Chiffrage : chaque poste reste distinct, le transport n'est jamais fondu
 * dans la marge produit.
 * ---------------------------------------------------------------------- */
export function chiffrer(produits: Produit[], gamme: Gamme, budget: number): Chiffrage {
  const emballage = emballagePour(gamme, budget).parametre;
  const fragiles = produits.filter((p) => p.fragile).length;

  const coutProduitsAchatHt = produits.reduce((s, p) => s + p.prixAchatHt, 0);
  const coutEmballageHt = emballage.coutAchatHt;
  const coutProtectionHt = fragiles * PROTECTION_PAR_PRODUIT_FRAGILE_HT;
  const coutPreparationHt =
    (PREPARATION.minutesParGamme[gamme] / 60) * PREPARATION.tauxHoraireHt;
  const coutRevientHt =
    coutProduitsAchatHt + coutEmballageHt + coutProtectionHt + coutPreparationHt;

  const prixProduitsHt = produits.reduce((s, p) => s + p.prixVenteHt, 0);
  const prixEmballageHt = emballage.prixVenteHt;
  const prixCoffretHt = prixProduitsHt + prixEmballageHt;

  const tvaCoffret =
    produits.reduce((s, p) => s + p.prixVenteHt * p.tva, 0) + prixEmballageHt * TVA_EMBALLAGE;

  return {
    coutProduitsAchatHt: arrondi(coutProduitsAchatHt),
    coutEmballageHt: arrondi(coutEmballageHt),
    coutProtectionHt: arrondi(coutProtectionHt),
    coutPreparationHt: arrondi(coutPreparationHt),
    coutRevientHt: arrondi(coutRevientHt),
    prixProduitsHt: arrondi(prixProduitsHt),
    prixEmballageHt: arrondi(prixEmballageHt),
    prixCoffretHt: arrondi(prixCoffretHt),
    tvaCoffret: arrondi(tvaCoffret),
    prixCoffretTtc: arrondi(prixCoffretHt + tvaCoffret),
    margeEur: arrondi(prixCoffretHt - coutRevientHt),
    tauxMarge: prixCoffretHt ? (prixCoffretHt - coutRevientHt) / prixCoffretHt : 0,
  };
}

const arrondi = (v: number) => Math.round(v * 100) / 100;

export function poidsCoffret(produits: Produit[], gamme: Gamme, budget: number): number {
  const emballage = emballagePour(gamme, budget).parametre;
  const produitsG = produits.reduce((s, p) => s + (p.poidsNetG ?? p.volumeMl ?? 250) + 40, 0);
  const protections = produits.filter((p) => p.fragile).length * POIDS_PROTECTION_G;
  return Math.round(produitsG + emballage.poidsG + protections);
}

/* -------------------------------------------------------------------------
 * Les trois propositions
 * ---------------------------------------------------------------------- */
export function construirePropositions(besoin: Besoin): Proposition[] {
  const pool = produitsComposables().filter((p) => respecteRegimeAlcool(p, besoin.alcool));

  const dejaProposes = new Set<string>();

  return SQUELETTES.map((squelette) => {
    const produits = composer(squelette, besoin, pool, dejaProposes);
    produits.forEach((p) => dejaProposes.add(p.id));
    const chiffrage = chiffrer(produits, squelette.gamme, besoin.budget);
    const manque = squelette.nbProduits - produits.length;
    return {
      gamme: squelette.gamme,
      libelle: squelette.libelle,
      accroche: squelette.accroche,
      produits,
      nbProduitsFragiles: produits.filter((p) => p.fragile).length,
      poidsCoffretG: poidsCoffret(produits, squelette.gamme, besoin.budget),
      chiffrage,
      ecartBudget: arrondi(chiffrage.prixCoffretHt - besoin.budget),
      argumentaire: argumenter(produits, squelette, besoin.budget),
      // Le budget peut ne pas permettre le nombre de produits visé. On le dit
      // plutôt que de composer un coffret creux ou de dépasser sans prévenir.
      limiteBudget:
        manque > 0
          ? {
              produitsManquants: manque,
              budgetConseille: budgetPourGammeComplete(squelette, produits, besoin),
            }
          : null,
    };
  });
}

/** Budget minimal permettant d'atteindre le nombre de produits visé. */
function budgetPourGammeComplete(
  squelette: Squelette,
  produits: Produit[],
  besoin: Besoin,
): number {
  const manque = squelette.nbProduits - produits.length;
  const emballage = emballagePour(squelette.gamme, besoin.budget).parametre;
  const necessaire = total(produits) + manque * 5 + emballage.prixVenteHt;
  return Math.ceil(necessaire / squelette.cibleBudget / 5) * 5;
}

function argumenter(produits: Produit[], squelette: Squelette, budget: number): string[] {
  const points: string[] = [`${produits.length} produits`];
  const emballage = emballagePour(squelette.gamme, budget).parametre;
  points.push(emballage.description);

  const appellations = produits.filter((p) => p.appellation).length;
  if (appellations) points.push(`${appellations} produit${appellations > 1 ? "s" : ""} sous appellation protégée`);

  const producteurs = new Set(produits.map((p) => p.producteur)).size;
  points.push(`${producteurs} producteurs normands`);

  const maitresse = produits.reduce(
    (a, b) => (b.noblesse > a.noblesse ? b : a),
    produits[0],
  );
  if (maitresse && squelette.pieceMaitresse) points.push(`Pièce maîtresse : ${maitresse.nom}`);

  const sansAlcool = produits.every((p) => p.alcool === "NON");
  if (sansAlcool) points.push("Entièrement sans alcool");

  return points;
}

/* -------------------------------------------------------------------------
 * Substitution : recherche d'une alternative réelle du catalogue
 * ---------------------------------------------------------------------- */
export function alternativesPour(
  produit: Produit,
  besoin: Besoin,
  dejaPresents: string[],
): Produit[] {
  return getAlternatives(produit.id)
    .filter((p) => respecteRegimeAlcool(p, besoin.alcool))
    .filter((p) => !dejaPresents.includes(p.id))
    .sort((a, b) => scorePertinence(b, besoin) - scorePertinence(a, besoin))
    .slice(0, 6);
}

/* -------------------------------------------------------------------------
 * Transport et devis
 * ---------------------------------------------------------------------- */
export function calculerTransport(poidsTotalG: number, nbColis: number) {
  const parColis = poidsTotalG / Math.max(nbColis, 1) / 1000;
  const palier = TRANSPORT.find((t) => parColis <= t.poidsMaxKg) ?? TRANSPORT[TRANSPORT.length - 1];
  return arrondi(palier.tarifHt * nbColis);
}

export function nombreDeColis(poidsUnitaireG: number, quantite: number): number {
  const parColis = Math.max(
    1,
    Math.floor((POIDS_MAX_COLIS_KG * 1000 - POIDS_CARTON_EXPEDITION_G) / poidsUnitaireG),
  );
  return Math.ceil(quantite / parColis);
}

export function remiseApplicable(quantite: number) {
  const paliers = REMISES_QUANTITE.filter((r) => quantite >= r.quantiteMin).sort(
    (a, b) => b.pourcentage - a.pourcentage,
  );
  return paliers[0] ?? null;
}

export function construireDevis(
  besoin: Besoin,
  proposition: Proposition,
  extras: Produit[],
  numero: string,
): Devis {
  const lignes: LigneCommande[] = [
    {
      libelle: `Coffret ${proposition.libelle}`,
      detail: proposition.produits.map((p) => p.nom).join(" · "),
      quantite: besoin.quantite,
      prixUnitaireHt: proposition.chiffrage.prixCoffretHt,
      tva: proposition.chiffrage.tvaCoffret / proposition.chiffrage.prixCoffretHt,
      totalHt: arrondi(proposition.chiffrage.prixCoffretHt * besoin.quantite),
    },
    ...extras.map((p) => ({
      libelle: p.nom,
      detail: `${p.producteur} — ${p.producteurVille}`,
      quantite: besoin.quantite,
      prixUnitaireHt: p.prixVenteHt,
      tva: p.tva,
      totalHt: arrondi(p.prixVenteHt * besoin.quantite),
    })),
  ];

  const totalProduitsHt = arrondi(proposition.chiffrage.prixCoffretHt * besoin.quantite);
  const totalExtrasHt = arrondi(
    extras.reduce((s, p) => s + p.prixVenteHt, 0) * besoin.quantite,
  );

  const remise = remiseApplicable(besoin.quantite);
  const totalRemise = remise
    ? arrondi((totalProduitsHt + totalExtrasHt) * (remise.pourcentage / 100))
    : 0;

  const totalHtHorsTransport = arrondi(totalProduitsHt + totalExtrasHt - totalRemise);

  const poidsUnitaireG =
    proposition.poidsCoffretG + extras.reduce((s, p) => s + (p.poidsNetG ?? 200), 0);
  const nbColis = nombreDeColis(poidsUnitaireG, besoin.quantite);
  const transportHt = calculerTransport(poidsUnitaireG * besoin.quantite, nbColis);

  const totalHt = arrondi(totalHtHorsTransport + transportHt);
  const tvaProduits =
    (proposition.chiffrage.tvaCoffret +
      extras.reduce((s, p) => s + p.prixVenteHt * p.tva, 0)) *
    besoin.quantite;
  const totalTva = arrondi(tvaProduits + transportHt * TVA_TRANSPORT);

  const coutRevientTotal =
    (proposition.chiffrage.coutRevientHt + extras.reduce((s, p) => s + p.prixAchatHt, 0)) *
    besoin.quantite;
  // Le transport est refacturé au coût : il n'entre ni dans la marge, ni dans le coût de revient produit.
  const margeTotaleEur = arrondi(totalHtHorsTransport - coutRevientTotal);

  return {
    numero,
    besoin,
    proposition,
    extras,
    lignes,
    totalProduitsHt,
    totalExtrasHt,
    totalRemise,
    totalHtHorsTransport,
    transportHt,
    totalHt,
    totalTva,
    totalTtc: arrondi(totalHt + totalTva),
    margeTotaleEur,
    tauxMargeGlobal: totalHtHorsTransport ? margeTotaleEur / totalHtHorsTransport : 0,
    poidsTotalKg: arrondi((poidsUnitaireG * besoin.quantite) / 1000),
    nbColis,
  };
}

export function numeroDevis(besoin: Besoin, gamme: string): string {
  const base = `${besoin.typeClient}${besoin.budget}${besoin.quantite}${gamme}${besoin.alcool}`;
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) hash = (hash * 31 + base.charCodeAt(i)) % 1000000;
  return `MD-DEV-2026-${String(hash).padStart(6, "0")}`;
}
