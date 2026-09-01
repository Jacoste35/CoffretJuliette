export type TypeClient = "PARTICULIER" | "PROFESSIONNEL";
export type RegimeAlcool = "AVEC" | "SANS" | "INDIFFERENT";
export type Priorite = "BUDGET" | "QUALITE" | "VALEUR_PERCUE";
export type Gamme = "ESSENTIEL" | "SIGNATURE" | "PRESTIGE";

export interface Produit {
  id: string;
  nom: string;
  description: string;
  categorie: string;
  sousCategorie: string;
  producteur: string;
  producteurVille: string;
  fournisseur: string;
  departement: string;
  region: string;
  appellation: string;
  alerteMatierePremiere: string;
  alcool: "OUI" | "NON" | "INGREDIENT_ALCOOLISE";
  typeAlcool: string;
  degreAlcool: string;
  poidsNetG: number | null;
  volumeMl: number | null;
  conditionnement: string;
  prixAchatHt: number;
  prixVenteHt: number;
  tva: number;
  tvaConfirmee: boolean;
  margeEur: number;
  tauxMarge: number;
  noblesse: number;
  gamme: string;
  contientVerre: boolean;
  fragile: boolean;
  produitNoel: boolean;
  delaiFournisseur: string;
  disponibilite: string;
  multipleCommande: number | null;
  source: string;
}

export interface Producteur {
  id: string;
  nom: string;
  role: string;
  ville: string;
  codePostal: string;
  departement: string;
  region: string;
  siteInternet: string;
  delais: string;
  nbProduits: number;
}

export interface Remise {
  code: string;
  type: string;
  fournisseur: string;
  produits: string;
  palier: string;
  remise: string;
  texteSource: string;
  source: string;
}

export interface Catalogue {
  produits: Produit[];
  producteurs: Producteur[];
  alternatives: Record<string, { id: string; relationPrix: string; ecartPct: number }[]>;
  remises: Remise[];
}

/** Réponses du questionnaire client. */
export interface Besoin {
  typeClient: TypeClient;
  budget: number; // par coffret, HT
  quantite: number;
  alcool: RegimeAlcool;
  preferences: string[];
  occasion: string;
  priorite: Priorite;
  societe?: string;
  contact?: string;
  email?: string;
  telephone?: string;
}

/** Décomposition complète du prix, jamais agrégée : chaque poste reste lisible. */
export interface Chiffrage {
  coutProduitsAchatHt: number;
  coutEmballageHt: number;
  coutProtectionHt: number;
  coutPreparationHt: number;
  coutRevientHt: number;
  prixProduitsHt: number;
  prixEmballageHt: number;
  prixCoffretHt: number;
  tvaCoffret: number;
  prixCoffretTtc: number;
  margeEur: number;
  tauxMarge: number;
}

export interface Proposition {
  gamme: Gamme;
  libelle: string;
  accroche: string;
  produits: Produit[];
  nbProduitsFragiles: number;
  poidsCoffretG: number;
  chiffrage: Chiffrage;
  ecartBudget: number;
  argumentaire: string[];
  /** Renseigné quand le budget ne permet pas le nombre de produits visé. */
  limiteBudget: { produitsManquants: number; budgetConseille: number } | null;
}

export interface LigneCommande {
  libelle: string;
  detail: string;
  quantite: number;
  prixUnitaireHt: number;
  tva: number;
  totalHt: number;
}

export interface Devis {
  numero: string;
  besoin: Besoin;
  proposition: Proposition;
  extras: Produit[];
  lignes: LigneCommande[];
  totalProduitsHt: number;
  totalExtrasHt: number;
  totalRemise: number;
  totalHtHorsTransport: number;
  transportHt: number;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  margeTotaleEur: number;
  tauxMargeGlobal: number;
  poidsTotalKg: number;
  nbColis: number;
}
