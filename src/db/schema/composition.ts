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
import { contenant, produit } from './catalogue';
import { niveauGamme } from './enums';

const horodatage = {
  creeLe: timestamp({ withTimezone: true }).notNull().defaultNow(),
  modifieLe: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

/**
 * Un univers n'est pas une liste de produits, c'est une structure de coffret.
 * Éditable en back-office : créer « Le Breton » ne doit pas demander un
 * développeur.
 */
export const gabarit = pgTable('gabarit', {
  id: uuid().primaryKey().defaultRandom(),
  code: text().notNull().unique(),
  nom: text().notNull(),
  description: text(),
  gamme: niveauGamme(),
  piecesMin: smallint().notNull().default(3),
  piecesMax: smallint().notNull().default(8),
  /** Filtres appliqués à tout le gabarit : bio, normand confirmé, sans alcool. */
  contraintes: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  ordreAffichage: smallint().notNull().default(0),
  actif: boolean().notNull().default(true),
  ...horodatage,
});

export const gabaritSlot = pgTable(
  'gabarit_slot',
  {
    id: uuid().primaryKey().defaultRandom(),
    gabaritId: uuid()
      .notNull()
      .references(() => gabarit.id, { onDelete: 'cascade' }),
    position: smallint().notNull(),
    role: text().notNull(),
    categoriesAdmises: text().array().notNull(),
    sousCategoriesExclues: text().array(),
    /** Points de base du budget net : 2500 = 25 %. */
    partCibleBp: smallint().notNull(),
    partMaxBp: smallint().notNull(),
    requis: boolean().notNull().default(true),
    ...horodatage,
  },
  (t) => [unique('gabarit_slot_position_unique').on(t.gabaritId, t.position)],
);

export const composition = pgTable(
  'composition',
  {
    id: uuid().primaryKey().defaultRandom(),
    gabaritId: uuid().references(() => gabarit.id, { onDelete: 'set null' }),
    contenantId: uuid().references(() => contenant.id, { onDelete: 'set null' }),

    budgetCibleCentimes: integer().notNull(),
    budgetNetCentimes: integer().notNull(),
    totalHtCentimes: integer().notNull(),
    totalTvaCentimes: integer().notNull(),
    totalTtcCentimes: integer().notNull(),
    coutRevientHtCentimes: integer(),
    /** Points de base : 4200 = 42 % de marge. */
    tauxMargeBp: smallint(),
    /** Points de base du budget consommé : 9850 = 98,5 %. */
    tauxRemplissageBp: smallint().notNull(),

    /**
     * hash(budget, quantité, préférences, semaine, version catalogue).
     * La même demande doit produire les mêmes propositions : le PDF de devis
     * doit correspondre à ce que le client a vu à l'écran.
     */
    empreinte: text().notNull(),
    anneeIso: smallint().notNull(),
    semaineIso: smallint().notNull(),
    /** Vrai dès qu'un client l'a retenue : elle n'est plus recalculable. */
    figee: boolean().notNull().default(false),
    ...horodatage,
  },
  (t) => [
    index('composition_empreinte_idx').on(t.empreinte),
    index('composition_gabarit_idx').on(t.gabaritId),
  ],
);

export const compositionLigne = pgTable(
  'composition_ligne',
  {
    id: uuid().primaryKey().defaultRandom(),
    compositionId: uuid()
      .notNull()
      .references(() => composition.id, { onDelete: 'cascade' }),
    produitId: uuid()
      .notNull()
      .references(() => produit.id, { onDelete: 'restrict' }),
    slotId: uuid().references(() => gabaritSlot.id, { onDelete: 'set null' }),
    position: smallint().notNull(),
    quantite: integer().notNull().default(1),

    /** Prix GELÉ à la date du devis. Jamais relu depuis le catalogue. */
    prixUnitaireHtCentimes: integer().notNull(),
    tauxTvaBp: smallint().notNull(),
    prixAchatUnitaireHtCentimes: integer(),

    /** Vrai si le client a échangé ce produit lui-même. */
    choixClient: boolean().notNull().default(false),
    ...horodatage,
  },
  (t) => [
    unique('composition_ligne_position_unique').on(t.compositionId, t.position),
    index('composition_ligne_produit_idx').on(t.produitId),
  ],
);
