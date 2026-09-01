import { pgEnum } from 'drizzle-orm/pg-core';

export const niveauGamme = pgEnum('niveau_gamme', [
  'ESSENTIEL',
  'SIGNATURE',
  'PREMIUM',
  'PRESTIGE',
]);

/**
 * Trois valeurs, pas deux. « INGREDIENT_ALCOOLISE » désigne une terrine au
 * calvados ou une confiture au cidre : ni une boisson alcoolisée, ni un
 * produit sans alcool. Le moteur doit trancher explicitement, et non hériter
 * d'un booléen qui écraserait la distinction.
 */
export const regimeAlcool = pgEnum('regime_alcool', [
  'SANS_ALCOOL',
  'INGREDIENT_ALCOOLISE',
  'BOISSON_ALCOOLISEE',
]);

/** Un coffret ne mélange jamais deux températures. */
export const temperature = pgEnum('temperature', ['AMBIANT', 'FRAIS', 'SURGELE']);

/**
 * Reprend la hiérarchie de preuve de la base produits : un produit n'est
 * jamais déclaré normand parce qu'il est vendu par une entreprise normande.
 */
export const niveauPreuveOrigine = pgEnum('niveau_preuve_origine', [
  'ADRESSE_PRODUCTEUR_DANS_LE_DOCUMENT',
  'APPELLATION_PROTEGEE_CITEE_DANS_LE_DOCUMENT',
  'APPELLATION_PORTANT_SUR_UN_INGREDIENT_SEULEMENT',
  'INDICE_DANS_LE_NOM_DU_PRODUIT_SEULEMENT',
  'NON_DOCUMENTEE',
]);

export const etatDevis = pgEnum('etat_devis', [
  'BROUILLON',
  'A_VALIDER',
  'ENVOYE',
  'VU',
  'ACCEPTE',
  'ACOMPTE_PAYE',
  'CONFIRMEE',
  'REFUSE',
  'EXPIRE',
]);

export const etatCommande = pgEnum('etat_commande', [
  'EN_ATTENTE_PAIEMENT',
  'CONFIRMEE',
  'EN_PREPARATION',
  'PREPAREE',
  'EXPEDIEE',
  'LIVREE',
  'ANNULEE',
]);

export const typeClient = pgEnum('type_client', ['PARTICULIER', 'PROFESSIONNEL']);

export const statutValidationPro = pgEnum('statut_validation_pro', [
  'NON_APPLICABLE',
  'EN_ATTENTE',
  'VALIDE',
  'REFUSE',
]);

export const typePaiement = pgEnum('type_paiement', ['ACOMPTE', 'SOLDE', 'INTEGRAL']);

export const statutPaiement = pgEnum('statut_paiement', [
  'EN_ATTENTE',
  'REUSSI',
  'ECHOUE',
  'REMBOURSE',
]);

export const motifSubstitution = pgEnum('motif_substitution', [
  'RUPTURE_PRODUCTEUR',
  'QUALITE_INSUFFISANTE',
  'RETARD_LIVRAISON',
  'AUTRE',
]);

export const typeProjet = pgEnum('type_projet', [
  'CADEAUX_CLIENTS',
  'CADEAUX_SALARIES',
  'CSE',
  'PARTICULIER',
]);

export const baseLegaleConsentement = pgEnum('base_legale_consentement', [
  'CONSENTEMENT',
  'CONTRAT',
  'INTERET_LEGITIME',
  'OBLIGATION_LEGALE',
]);
