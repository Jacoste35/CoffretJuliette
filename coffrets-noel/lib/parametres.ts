/**
 * Paramètres économiques et logistiques du moteur.
 *
 * ⚠️ AUCUNE de ces valeurs ne provient des documents fournisseurs. Ce sont des
 * HYPOTHÈSES DE TRAVAIL, nécessaires pour que le moteur produise un chiffrage
 * complet. Elles sont affichées comme telles dans le récapitulatif et dans le
 * back-office, et doivent être remplacées par les tarifs réels (emballage,
 * transporteur, temps de préparation) dès qu'ils seront connus.
 *
 * Rien n'est codé en dur ailleurs dans l'application : tout passe par ce fichier,
 * destiné à être remplacé par une table `engine_parameters` en base.
 */

export const STATUT_HYPOTHESE =
  "HYPOTHÈSE DE TRAVAIL — à remplacer par vos tarifs réels";

export interface ParametreEmballage {
  libelle: string;
  description: string;
  coutAchatHt: number;
  prixVenteHt: number;
  poidsG: number;
  nbProduitsMax: number;
}

export const EMBALLAGES: Record<string, ParametreEmballage> = {
  ESSENTIEL: {
    libelle: "Coffret carton kraft",
    description: "Boîte carton, frisure naturelle, étiquette",
    coutAchatHt: 3.5,
    prixVenteHt: 4.9,
    poidsG: 320,
    nbProduitsMax: 4,
  },
  SIGNATURE: {
    libelle: "Coffret rigide, papier de soie et ruban",
    description: "Boîte rigide, papier de soie, frisure, ruban, carte",
    coutAchatHt: 6.5,
    prixVenteHt: 9.5,
    poidsG: 480,
    nbProduitsMax: 6,
  },
  PRESTIGE: {
    libelle: "Coffret prestige, finition soignée",
    description: "Boîte premium, papier de qualité, ruban premium, carte, calage",
    coutAchatHt: 11,
    prixVenteHt: 16,
    poidsG: 700,
    nbProduitsMax: 8,
  },
};

export const PROTECTION_PAR_PRODUIT_FRAGILE_HT = 0.8;
export const POIDS_PROTECTION_G = 60;

export const PREPARATION = {
  tauxHoraireHt: 25,
  minutesParGamme: { ESSENTIEL: 3, SIGNATURE: 6, PRESTIGE: 10 } as Record<string, number>,
  minutesPersonnalisation: 2,
};

/** Grille de transport provisoire, à remplacer par la grille transporteur. */
export const TRANSPORT = [
  { poidsMaxKg: 2, tarifHt: 6.9 },
  { poidsMaxKg: 5, tarifHt: 8.9 },
  { poidsMaxKg: 10, tarifHt: 12.9 },
  { poidsMaxKg: 20, tarifHt: 18.9 },
  { poidsMaxKg: 30, tarifHt: 24.9 },
];
export const POIDS_MAX_COLIS_KG = 20;
export const POIDS_CARTON_EXPEDITION_G = 350;

/**
 * Remises quantitatives.
 *
 * VOLONTAIREMENT VIDE : aucun des documents fournisseurs ne contient de grille
 * de remise par volume. Le moteur applique ce qui est renseigné ici et rien
 * d'autre — il n'invente aucune remise. Ajouter des paliers ici les activera
 * immédiatement dans le parcours client et dans le devis.
 */
export const REMISES_QUANTITE: { quantiteMin: number; pourcentage: number; libelle: string }[] = [];

export const TVA_EMBALLAGE = 0.2;
export const TVA_TRANSPORT = 0.2;

/** Hiérarchie de décision du moteur, dans l'ordre. La marge vient en dernier. */
export const PRIORITES_MOTEUR = [
  "Besoin exprimé par le client",
  "Respect du budget",
  "Cohérence du coffret",
  "Qualité perçue",
  "Niveau de gamme",
  "Disponibilité",
  "Logistique",
  "Marge",
];
