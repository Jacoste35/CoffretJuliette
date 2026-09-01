import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { composition } from './composition';
import { produit } from './catalogue';
import {
  etatCommande,
  etatDevis,
  motifSubstitution,
  statutPaiement,
  statutValidationPro,
  typeClient,
  typePaiement,
  typeProjet,
} from './enums';

const horodatage = {
  creeLe: timestamp({ withTimezone: true }).notNull().defaultNow(),
  modifieLe: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

export const client = pgTable(
  'client',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Identifiant Supabase Auth. Nul tant que le compte n'est pas créé. */
    authUserId: uuid().unique(),
    type: typeClient().notNull().default('PARTICULIER'),
    email: text().notNull(),
    prenom: text(),
    nom: text(),
    telephone: text(),

    raisonSociale: text(),
    siret: text(),
    tvaIntracom: text(),
    statutValidationPro: statutValidationPro().notNull().default('NON_APPLICABLE'),
    validePar: text(),
    valideLe: timestamp({ withTimezone: true }),

    /** Les professionnels voient du HT, les particuliers du TTC. */
    afficherHt: boolean().notNull().default(false),
    ...horodatage,
  },
  (t) => [
    unique('client_email_unique').on(t.email),
    index('client_type_idx').on(t.type),
  ],
);

export const adresse = pgTable(
  'adresse',
  {
    id: uuid().primaryKey().defaultRandom(),
    clientId: uuid()
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    libelle: text(),
    destinataire: text().notNull(),
    societe: text(),
    ligne1: text().notNull(),
    ligne2: text(),
    codePostal: text().notNull(),
    ville: text().notNull(),
    pays: text().notNull().default('FR'),
    telephone: text(),
    facturation: boolean().notNull().default(false),
    ...horodatage,
  },
  (t) => [index('adresse_client_idx').on(t.clientId)],
);

export const devis = pgTable(
  'devis',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Numérotation continue, lisible : DEV-2026-0001. */
    numero: text().notNull().unique(),
    clientId: uuid().references(() => client.id, { onDelete: 'set null' }),
    typeProjet: typeProjet(),
    etat: etatDevis().notNull().default('BROUILLON'),

    nombreCoffrets: integer().notNull(),
    budgetParCoffretCentimes: integer().notNull(),
    preferences: jsonb().$type<Record<string, unknown>>().notNull().default({}),

    totalHtCentimes: integer().notNull().default(0),
    totalTvaCentimes: integer().notNull().default(0),
    totalTtcCentimes: integer().notNull().default(0),
    remiseCentimes: integer().notNull().default(0),
    /** Ventilation par taux, figée à l'émission. */
    ventilationTva: jsonb().$type<unknown[]>().notNull().default([]),

    /** Jeton non devinable, à durée de vie limitée, pour l'accès sans compte. */
    jetonPublic: text().notNull().unique(),
    valableJusquau: timestamp({ withTimezone: true }).notNull(),
    envoyeLe: timestamp({ withTimezone: true }),
    vuLe: timestamp({ withTimezone: true }),
    accepteLe: timestamp({ withTimezone: true }),
    refuseLe: timestamp({ withTimezone: true }),

    /** Version des CGV acceptées : indispensable en cas de litige. */
    cgvVersionId: uuid(),
    /** Renseigné quand le devis dépasse un plafond et attend une relecture. */
    motifValidationManuelle: text(),
    urlPdf: text(),
    ...horodatage,
  },
  (t) => [
    index('devis_etat_idx').on(t.etat),
    index('devis_client_idx').on(t.clientId),
    index('devis_cree_le_idx').on(t.creeLe),
  ],
);

export const devisComposition = pgTable(
  'devis_composition',
  {
    id: uuid().primaryKey().defaultRandom(),
    devisId: uuid()
      .notNull()
      .references(() => devis.id, { onDelete: 'cascade' }),
    compositionId: uuid()
      .notNull()
      .references(() => composition.id, { onDelete: 'restrict' }),
    quantite: integer().notNull().default(1),
    /** Vrai pour la proposition retenue par le client. */
    retenue: boolean().notNull().default(false),
    ...horodatage,
  },
  (t) => [unique('devis_composition_unique').on(t.devisId, t.compositionId)],
);

export const commande = pgTable(
  'commande',
  {
    id: uuid().primaryKey().defaultRandom(),
    numero: text().notNull().unique(),
    devisId: uuid().references(() => devis.id, { onDelete: 'set null' }),
    clientId: uuid()
      .notNull()
      .references(() => client.id, { onDelete: 'restrict' }),

    /**
     * Le multi-destinataires est reporté en v2, mais la colonne existe dès
     * maintenant : une commande mère portera alors des commandes filles, une
     * par adresse de livraison. Prévoir la colonne aujourd'hui évite une
     * migration lourde sur des données de production.
     */
    commandeMereId: uuid(),

    etat: etatCommande().notNull().default('EN_ATTENTE_PAIEMENT'),
    adresseLivraisonId: uuid().references(() => adresse.id, { onDelete: 'set null' }),
    adresseFacturationId: uuid().references(() => adresse.id, { onDelete: 'set null' }),

    totalHtCentimes: integer().notNull().default(0),
    totalTvaCentimes: integer().notNull().default(0),
    totalTtcCentimes: integer().notNull().default(0),
    remiseCentimes: integer().notNull().default(0),
    ventilationTva: jsonb().$type<unknown[]>().notNull().default([]),

    anneeIso: smallint().notNull(),
    semaineIso: smallint().notNull(),
    dateLivraisonSouhaitee: timestamp({ withTimezone: true }),
    messageCadeau: text(),
    cgvVersionId: uuid(),
    ...horodatage,
  },
  (t) => [
    index('commande_etat_idx').on(t.etat),
    index('commande_semaine_idx').on(t.anneeIso, t.semaineIso),
    index('commande_mere_idx').on(t.commandeMereId),
  ],
);

export const commandeLigne = pgTable(
  'commande_ligne',
  {
    id: uuid().primaryKey().defaultRandom(),
    commandeId: uuid()
      .notNull()
      .references(() => commande.id, { onDelete: 'cascade' }),
    /** Nul pour une ligne de port, d'emballage ou de personnalisation. */
    produitId: uuid().references(() => produit.id, { onDelete: 'restrict' }),
    compositionId: uuid().references(() => composition.id, { onDelete: 'set null' }),

    libelle: text().notNull(),
    /** PRODUIT, CONTENANT, EMBALLAGE, PERSONNALISATION, PORT, COMPOSITION. */
    nature: text().notNull().default('PRODUIT'),
    quantite: integer().notNull().default(1),
    prixUnitaireHtCentimes: integer().notNull(),
    tauxTvaBp: smallint().notNull(),
    position: smallint().notNull(),
    ...horodatage,
  },
  (t) => [
    index('commande_ligne_commande_idx').on(t.commandeId),
    index('commande_ligne_produit_idx').on(t.produitId),
  ],
);

/** Prévu pour la v2. Vide en v1 : une commande, une adresse. */
export const destinataire = pgTable(
  'destinataire',
  {
    id: uuid().primaryKey().defaultRandom(),
    commandeMereId: uuid()
      .notNull()
      .references(() => commande.id, { onDelete: 'cascade' }),
    commandeFilleId: uuid().references(() => commande.id, { onDelete: 'set null' }),
    nom: text().notNull(),
    societe: text(),
    ligne1: text().notNull(),
    ligne2: text(),
    codePostal: text().notNull(),
    ville: text().notNull(),
    pays: text().notNull().default('FR'),
    email: text(),
    telephone: text(),
    messageCadeau: text(),
    nombreCoffrets: integer().notNull().default(1),
    ...horodatage,
  },
  (t) => [index('destinataire_commande_idx').on(t.commandeMereId)],
);

export const paiement = pgTable(
  'paiement',
  {
    id: uuid().primaryKey().defaultRandom(),
    commandeId: uuid()
      .notNull()
      .references(() => commande.id, { onDelete: 'cascade' }),
    type: typePaiement().notNull(),
    statut: statutPaiement().notNull().default('EN_ATTENTE'),
    montantTtcCentimes: integer().notNull(),
    ventilationTva: jsonb().$type<unknown[]>().notNull().default([]),

    /** Aucune donnée bancaire ici : uniquement des références Stripe. */
    stripePaymentIntentId: text().unique(),
    stripeCheckoutSessionId: text(),
    /** Le webhook fait foi, jamais le retour navigateur. */
    confirmeParWebhookLe: timestamp({ withTimezone: true }),
    ...horodatage,
  },
  (t) => [index('paiement_commande_idx').on(t.commandeId)],
);

export const facture = pgTable(
  'facture',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Numérotation continue, sans trou : FAC-2026-0001. */
    numero: text().notNull().unique(),
    commandeId: uuid()
      .notNull()
      .references(() => commande.id, { onDelete: 'restrict' }),
    paiementId: uuid().references(() => paiement.id, { onDelete: 'set null' }),
    /** Une facture d'acompte est obligatoire en B2B. */
    estAcompte: boolean().notNull().default(false),
    /** Négatif pour un avoir. */
    totalHtCentimes: integer().notNull(),
    totalTvaCentimes: integer().notNull(),
    totalTtcCentimes: integer().notNull(),
    ventilationTva: jsonb().$type<unknown[]>().notNull().default([]),
    emiseLe: timestamp({ withTimezone: true }).notNull().defaultNow(),
    urlPdf: text(),
    ...horodatage,
  },
  (t) => [index('facture_commande_idx').on(t.commandeId)],
);

/**
 * Journal d'audit. Jamais modifié, jamais supprimé : c'est la trace de ce qui
 * a réellement été livré, et elle sert autant au client qu'au contrôle.
 */
export const substitution = pgTable(
  'substitution',
  {
    id: uuid().primaryKey().defaultRandom(),
    commandeLigneId: uuid()
      .notNull()
      .references(() => commandeLigne.id, { onDelete: 'restrict' }),
    produitPrevuId: uuid()
      .notNull()
      .references(() => produit.id, { onDelete: 'restrict' }),
    produitLivreId: uuid()
      .notNull()
      .references(() => produit.id, { onDelete: 'restrict' }),
    motif: motifSubstitution().notNull(),
    commentaire: text(),
    /** Positif : le remplaçant vaut au moins autant que le produit prévu. */
    ecartValeurCentimes: integer().notNull(),
    operateur: text().notNull(),
    creeLe: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('substitution_ligne_idx').on(t.commandeLigneId)],
);
