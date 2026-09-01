import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  niveauGamme,
  niveauPreuveOrigine,
  regimeAlcool,
  temperature,
} from './enums';

const horodatage = {
  creeLe: timestamp({ withTimezone: true }).notNull().defaultNow(),
  modifieLe: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

export const producteur = pgTable(
  'producteur',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Identifiant d'origine dans la base de reconstitution : FOUR-0007. */
    reference: text().notNull().unique(),
    nom: text().notNull(),
    role: text(),
    canalDeCommande: text(),
    contactNom: text(),
    telephone: text(),
    email: text(),
    siteInternet: text(),
    adresse: text(),
    codePostal: text(),
    ville: text(),
    departement: text(),
    region: text(),
    conditionsPaiement: text(),
    /** Texte exact du tarif : « Panachable en 2x10 par carton ». */
    conditionsPanachage: text(),
    minimumCommande: text(),
    delais: text(),
    actif: boolean().notNull().default(true),
    ...horodatage,
  },
  (t) => [index('producteur_nom_idx').on(t.nom)],
);

export const produit = pgTable(
  'produit',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Identifiant d'origine : PROD-0396. Sert de clé d'import idempotent. */
    reference: text().notNull().unique(),
    referenceFournisseur: text(),
    nom: text().notNull(),
    description: text(),
    categorie: text().notNull(),
    sousCategorie: text(),
    producteurId: uuid().references(() => producteur.id, { onDelete: 'restrict' }),
    marque: text(),

    // --- Origine, avec son niveau de preuve ---
    originePays: text(),
    origineRegion: text(),
    origineDepartement: text(),
    appellation: text(),
    niveauPreuveOrigine: niveauPreuveOrigine().notNull().default('NON_DOCUMENTEE'),
    /** Vrai uniquement si l'origine normande est documentée, jamais déduite. */
    normandieConfirmee: boolean().notNull().default(false),

    // --- Alcool ---
    regimeAlcool: regimeAlcool().notNull().default('SANS_ALCOOL'),
    degreAlcool: text(),
    typeAlcool: text(),

    // --- Prix, en centimes. Jamais de flottant sur un montant. ---
    prixAchatHtCentimes: integer(),
    prixVenteHtCentimes: integer(),
    /** Points de base : 550 = 5,5 %, 2000 = 20 %. Porté par produit. */
    tauxTvaBp: smallint(),

    // --- Logistique ---
    poidsNetG: integer(),
    poidsBrutG: integer(),
    longueurMm: integer(),
    largeurMm: integer(),
    hauteurMm: integer(),
    /** Encombrement en points, saisi grossièrement tant que les dimensions manquent. */
    encombrementPoints: integer(),
    temperature: temperature().notNull().default('AMBIANT'),
    expediable: boolean().notNull().default(true),
    fragile: boolean().notNull().default(false),
    contientVerre: boolean().notNull().default(false),

    // --- Conditions d'achat ---
    conditionnement: text(),
    multipleCommande: integer(),
    minimumCommande: integer(),
    panachable: boolean(),

    // --- Commercial ---
    niveauGamme: niveauGamme(),
    bio: boolean().notNull().default(false),
    allergenes: text(),
    urlPhoto: text(),
    ddm: date(),

    /**
     * 0 à 100, calculé à l'import. En dessous du seuil, le produit est
     * invisible pour le moteur : une donnée douteuse ne doit jamais finir
     * dans un devis contractuel.
     */
    scoreCompletude: smallint().notNull().default(0),
    /** Ce qui manque, pour l'écran d'arbitrage du back-office. */
    champsAConfirmer: text(),
    anomalie: text(),

    actif: boolean().notNull().default(false),
    source: text(),
    ligneSource: text(),
    ...horodatage,
  },
  (t) => [
    index('produit_categorie_idx').on(t.categorie),
    index('produit_producteur_idx').on(t.producteurId),
    index('produit_actif_idx').on(t.actif),
    index('produit_regime_alcool_idx').on(t.regimeAlcool),
    index('produit_gamme_idx').on(t.niveauGamme),
  ],
);

export const produitScore = pgTable('produit_score', {
  produitId: uuid()
    .primaryKey()
    .references(() => produit.id, { onDelete: 'cascade' }),
  noblesse: smallint(),
  valeurPercue: smallint(),
  local: smallint(),
  noel: smallint(),
  logistique: smallint(),
  ...horodatage,
});

export const produitSubstitut = pgTable(
  'produit_substitut',
  {
    id: uuid().primaryKey().defaultRandom(),
    produitId: uuid()
      .notNull()
      .references(() => produit.id, { onDelete: 'cascade' }),
    substitutId: uuid()
      .notNull()
      .references(() => produit.id, { onDelete: 'cascade' }),
    /** 1 = substitut principal, 2 = substitut de secours. */
    rang: smallint().notNull(),
    ecartPrixPct: integer(),
    critere: text(),
    ...horodatage,
  },
  (t) => [
    unique('produit_substitut_rang_unique').on(t.produitId, t.rang),
    index('produit_substitut_produit_idx').on(t.produitId),
  ],
);

/**
 * Un devis de mars ne doit jamais être relu avec les prix de juin.
 * Les lignes de composition gèlent leur prix, cette table garde la trace.
 */
export const produitPrixHisto = pgTable(
  'produit_prix_histo',
  {
    id: uuid().primaryKey().defaultRandom(),
    produitId: uuid()
      .notNull()
      .references(() => produit.id, { onDelete: 'cascade' }),
    prixAchatHtCentimes: integer(),
    prixVenteHtCentimes: integer(),
    tauxTvaBp: smallint(),
    applicableDu: timestamp({ withTimezone: true }).notNull().defaultNow(),
    motif: text(),
  },
  (t) => [index('produit_prix_histo_produit_idx').on(t.produitId, t.applicableDu)],
);

/**
 * Le cœur du modèle sans stock : la disponibilité est déclarée semaine par
 * semaine, pas dérivée d'un inventaire qui n'existe pas.
 */
export const disponibilite = pgTable(
  'disponibilite',
  {
    id: uuid().primaryKey().defaultRandom(),
    produitId: uuid()
      .notNull()
      .references(() => produit.id, { onDelete: 'cascade' }),
    /** Année ISO et numéro de semaine ISO, ex. 2026 et 49. */
    anneeIso: smallint().notNull(),
    semaineIso: smallint().notNull(),
    disponible: boolean().notNull().default(false),
    quantiteIndicative: integer(),
    commentaire: text(),
    ...horodatage,
  },
  (t) => [
    unique('disponibilite_produit_semaine_unique').on(t.produitId, t.anneeIso, t.semaineIso),
    index('disponibilite_semaine_idx').on(t.anneeIso, t.semaineIso, t.disponible),
  ],
);

export const contenant = pgTable('contenant', {
  id: uuid().primaryKey().defaultRandom(),
  reference: text().notNull().unique(),
  nom: text().notNull(),
  coutHtCentimes: integer().notNull(),
  /** Toujours le taux normal : un emballage n'est pas une denrée. */
  tauxTvaBp: smallint().notNull().default(2000),
  capacitePoints: integer().notNull(),
  longueurMm: integer(),
  largeurMm: integer(),
  hauteurMm: integer(),
  poidsAVideG: integer(),
  gammesCompatibles: text().array(),
  actif: boolean().notNull().default(true),
  ...horodatage,
});
