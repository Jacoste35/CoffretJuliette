CREATE TYPE "public"."base_legale_consentement" AS ENUM('CONSENTEMENT', 'CONTRAT', 'INTERET_LEGITIME', 'OBLIGATION_LEGALE');--> statement-breakpoint
CREATE TYPE "public"."etat_commande" AS ENUM('EN_ATTENTE_PAIEMENT', 'CONFIRMEE', 'EN_PREPARATION', 'PREPAREE', 'EXPEDIEE', 'LIVREE', 'ANNULEE');--> statement-breakpoint
CREATE TYPE "public"."etat_devis" AS ENUM('BROUILLON', 'A_VALIDER', 'ENVOYE', 'VU', 'ACCEPTE', 'ACOMPTE_PAYE', 'CONFIRMEE', 'REFUSE', 'EXPIRE');--> statement-breakpoint
CREATE TYPE "public"."motif_substitution" AS ENUM('RUPTURE_PRODUCTEUR', 'QUALITE_INSUFFISANTE', 'RETARD_LIVRAISON', 'AUTRE');--> statement-breakpoint
CREATE TYPE "public"."niveau_gamme" AS ENUM('ESSENTIEL', 'SIGNATURE', 'PREMIUM', 'PRESTIGE');--> statement-breakpoint
CREATE TYPE "public"."niveau_preuve_origine" AS ENUM('ADRESSE_PRODUCTEUR_DANS_LE_DOCUMENT', 'APPELLATION_PROTEGEE_CITEE_DANS_LE_DOCUMENT', 'APPELLATION_PORTANT_SUR_UN_INGREDIENT_SEULEMENT', 'INDICE_DANS_LE_NOM_DU_PRODUIT_SEULEMENT', 'NON_DOCUMENTEE');--> statement-breakpoint
CREATE TYPE "public"."regime_alcool" AS ENUM('SANS_ALCOOL', 'INGREDIENT_ALCOOLISE', 'BOISSON_ALCOOLISEE');--> statement-breakpoint
CREATE TYPE "public"."statut_paiement" AS ENUM('EN_ATTENTE', 'REUSSI', 'ECHOUE', 'REMBOURSE');--> statement-breakpoint
CREATE TYPE "public"."statut_validation_pro" AS ENUM('NON_APPLICABLE', 'EN_ATTENTE', 'VALIDE', 'REFUSE');--> statement-breakpoint
CREATE TYPE "public"."temperature" AS ENUM('AMBIANT', 'FRAIS', 'SURGELE');--> statement-breakpoint
CREATE TYPE "public"."type_client" AS ENUM('PARTICULIER', 'PROFESSIONNEL');--> statement-breakpoint
CREATE TYPE "public"."type_paiement" AS ENUM('ACOMPTE', 'SOLDE', 'INTEGRAL');--> statement-breakpoint
CREATE TYPE "public"."type_projet" AS ENUM('CADEAUX_CLIENTS', 'CADEAUX_SALARIES', 'CSE', 'PARTICULIER');--> statement-breakpoint
CREATE TABLE "contenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"nom" text NOT NULL,
	"cout_ht_centimes" integer NOT NULL,
	"taux_tva_bp" smallint DEFAULT 2000 NOT NULL,
	"capacite_points" integer NOT NULL,
	"longueur_mm" integer,
	"largeur_mm" integer,
	"hauteur_mm" integer,
	"poids_a_vide_g" integer,
	"gammes_compatibles" text[],
	"actif" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contenant_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "disponibilite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produit_id" uuid NOT NULL,
	"annee_iso" smallint NOT NULL,
	"semaine_iso" smallint NOT NULL,
	"disponible" boolean DEFAULT false NOT NULL,
	"quantite_indicative" integer,
	"commentaire" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disponibilite_produit_semaine_unique" UNIQUE("produit_id","annee_iso","semaine_iso")
);
--> statement-breakpoint
CREATE TABLE "producteur" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"nom" text NOT NULL,
	"role" text,
	"canal_de_commande" text,
	"contact_nom" text,
	"telephone" text,
	"email" text,
	"site_internet" text,
	"adresse" text,
	"code_postal" text,
	"ville" text,
	"departement" text,
	"region" text,
	"conditions_paiement" text,
	"conditions_panachage" text,
	"minimum_commande" text,
	"delais" text,
	"actif" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producteur_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "produit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"reference_fournisseur" text,
	"nom" text NOT NULL,
	"description" text,
	"categorie" text NOT NULL,
	"sous_categorie" text,
	"producteur_id" uuid,
	"marque" text,
	"origine_pays" text,
	"origine_region" text,
	"origine_departement" text,
	"appellation" text,
	"niveau_preuve_origine" "niveau_preuve_origine" DEFAULT 'NON_DOCUMENTEE' NOT NULL,
	"normandie_confirmee" boolean DEFAULT false NOT NULL,
	"regime_alcool" "regime_alcool" DEFAULT 'SANS_ALCOOL' NOT NULL,
	"degre_alcool" text,
	"type_alcool" text,
	"prix_achat_ht_centimes" integer,
	"prix_vente_ht_centimes" integer,
	"taux_tva_bp" smallint,
	"poids_net_g" integer,
	"poids_brut_g" integer,
	"longueur_mm" integer,
	"largeur_mm" integer,
	"hauteur_mm" integer,
	"encombrement_points" integer,
	"temperature" "temperature" DEFAULT 'AMBIANT' NOT NULL,
	"expediable" boolean DEFAULT true NOT NULL,
	"fragile" boolean DEFAULT false NOT NULL,
	"contient_verre" boolean DEFAULT false NOT NULL,
	"conditionnement" text,
	"multiple_commande" integer,
	"minimum_commande" integer,
	"panachable" boolean,
	"niveau_gamme" "niveau_gamme",
	"bio" boolean DEFAULT false NOT NULL,
	"allergenes" text,
	"url_photo" text,
	"ddm" date,
	"score_completude" smallint DEFAULT 0 NOT NULL,
	"champs_a_confirmer" text,
	"anomalie" text,
	"actif" boolean DEFAULT false NOT NULL,
	"source" text,
	"ligne_source" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produit_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "produit_prix_histo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produit_id" uuid NOT NULL,
	"prix_achat_ht_centimes" integer,
	"prix_vente_ht_centimes" integer,
	"taux_tva_bp" smallint,
	"applicable_du" timestamp with time zone DEFAULT now() NOT NULL,
	"motif" text
);
--> statement-breakpoint
CREATE TABLE "produit_score" (
	"produit_id" uuid PRIMARY KEY NOT NULL,
	"noblesse" smallint,
	"valeur_percue" smallint,
	"local" smallint,
	"noel" smallint,
	"logistique" smallint,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produit_substitut" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produit_id" uuid NOT NULL,
	"substitut_id" uuid NOT NULL,
	"rang" smallint NOT NULL,
	"ecart_prix_pct" integer,
	"critere" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produit_substitut_rang_unique" UNIQUE("produit_id","rang")
);
--> statement-breakpoint
CREATE TABLE "composition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gabarit_id" uuid,
	"contenant_id" uuid,
	"budget_cible_centimes" integer NOT NULL,
	"budget_net_centimes" integer NOT NULL,
	"total_ht_centimes" integer NOT NULL,
	"total_tva_centimes" integer NOT NULL,
	"total_ttc_centimes" integer NOT NULL,
	"cout_revient_ht_centimes" integer,
	"taux_marge_bp" smallint,
	"taux_remplissage_bp" smallint NOT NULL,
	"empreinte" text NOT NULL,
	"annee_iso" smallint NOT NULL,
	"semaine_iso" smallint NOT NULL,
	"figee" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "composition_ligne" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"composition_id" uuid NOT NULL,
	"produit_id" uuid NOT NULL,
	"slot_id" uuid,
	"position" smallint NOT NULL,
	"quantite" integer DEFAULT 1 NOT NULL,
	"prix_unitaire_ht_centimes" integer NOT NULL,
	"taux_tva_bp" smallint NOT NULL,
	"prix_achat_unitaire_ht_centimes" integer,
	"choix_client" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "composition_ligne_position_unique" UNIQUE("composition_id","position")
);
--> statement-breakpoint
CREATE TABLE "gabarit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"nom" text NOT NULL,
	"description" text,
	"gamme" "niveau_gamme",
	"pieces_min" smallint DEFAULT 3 NOT NULL,
	"pieces_max" smallint DEFAULT 8 NOT NULL,
	"contraintes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ordre_affichage" smallint DEFAULT 0 NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gabarit_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "gabarit_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gabarit_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"role" text NOT NULL,
	"categories_admises" text[] NOT NULL,
	"sous_categories_exclues" text[],
	"part_cible_bp" smallint NOT NULL,
	"part_max_bp" smallint NOT NULL,
	"requis" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gabarit_slot_position_unique" UNIQUE("gabarit_id","position")
);
--> statement-breakpoint
CREATE TABLE "adresse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"libelle" text,
	"destinataire" text NOT NULL,
	"societe" text,
	"ligne1" text NOT NULL,
	"ligne2" text,
	"code_postal" text NOT NULL,
	"ville" text NOT NULL,
	"pays" text DEFAULT 'FR' NOT NULL,
	"telephone" text,
	"facturation" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid,
	"type" "type_client" DEFAULT 'PARTICULIER' NOT NULL,
	"email" text NOT NULL,
	"prenom" text,
	"nom" text,
	"telephone" text,
	"raison_sociale" text,
	"siret" text,
	"tva_intracom" text,
	"statut_validation_pro" "statut_validation_pro" DEFAULT 'NON_APPLICABLE' NOT NULL,
	"valide_par" text,
	"valide_le" timestamp with time zone,
	"afficher_ht" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_authUserId_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "client_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "commande" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"devis_id" uuid,
	"client_id" uuid NOT NULL,
	"commande_mere_id" uuid,
	"etat" "etat_commande" DEFAULT 'EN_ATTENTE_PAIEMENT' NOT NULL,
	"adresse_livraison_id" uuid,
	"adresse_facturation_id" uuid,
	"total_ht_centimes" integer DEFAULT 0 NOT NULL,
	"total_tva_centimes" integer DEFAULT 0 NOT NULL,
	"total_ttc_centimes" integer DEFAULT 0 NOT NULL,
	"remise_centimes" integer DEFAULT 0 NOT NULL,
	"ventilation_tva" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"annee_iso" smallint NOT NULL,
	"semaine_iso" smallint NOT NULL,
	"date_livraison_souhaitee" timestamp with time zone,
	"message_cadeau" text,
	"cgv_version_id" uuid,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commande_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "commande_ligne" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commande_id" uuid NOT NULL,
	"produit_id" uuid,
	"composition_id" uuid,
	"libelle" text NOT NULL,
	"nature" text DEFAULT 'PRODUIT' NOT NULL,
	"quantite" integer DEFAULT 1 NOT NULL,
	"prix_unitaire_ht_centimes" integer NOT NULL,
	"taux_tva_bp" smallint NOT NULL,
	"position" smallint NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinataire" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commande_mere_id" uuid NOT NULL,
	"commande_fille_id" uuid,
	"nom" text NOT NULL,
	"societe" text,
	"ligne1" text NOT NULL,
	"ligne2" text,
	"code_postal" text NOT NULL,
	"ville" text NOT NULL,
	"pays" text DEFAULT 'FR' NOT NULL,
	"email" text,
	"telephone" text,
	"message_cadeau" text,
	"nombre_coffrets" integer DEFAULT 1 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"client_id" uuid,
	"type_projet" "type_projet",
	"etat" "etat_devis" DEFAULT 'BROUILLON' NOT NULL,
	"nombre_coffrets" integer NOT NULL,
	"budget_par_coffret_centimes" integer NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_ht_centimes" integer DEFAULT 0 NOT NULL,
	"total_tva_centimes" integer DEFAULT 0 NOT NULL,
	"total_ttc_centimes" integer DEFAULT 0 NOT NULL,
	"remise_centimes" integer DEFAULT 0 NOT NULL,
	"ventilation_tva" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"jeton_public" text NOT NULL,
	"valable_jusquau" timestamp with time zone NOT NULL,
	"envoye_le" timestamp with time zone,
	"vu_le" timestamp with time zone,
	"accepte_le" timestamp with time zone,
	"refuse_le" timestamp with time zone,
	"cgv_version_id" uuid,
	"motif_validation_manuelle" text,
	"url_pdf" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devis_numero_unique" UNIQUE("numero"),
	CONSTRAINT "devis_jetonPublic_unique" UNIQUE("jeton_public")
);
--> statement-breakpoint
CREATE TABLE "devis_composition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"devis_id" uuid NOT NULL,
	"composition_id" uuid NOT NULL,
	"quantite" integer DEFAULT 1 NOT NULL,
	"retenue" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devis_composition_unique" UNIQUE("devis_id","composition_id")
);
--> statement-breakpoint
CREATE TABLE "facture" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"commande_id" uuid NOT NULL,
	"paiement_id" uuid,
	"est_acompte" boolean DEFAULT false NOT NULL,
	"total_ht_centimes" integer NOT NULL,
	"total_tva_centimes" integer NOT NULL,
	"total_ttc_centimes" integer NOT NULL,
	"ventilation_tva" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"emise_le" timestamp with time zone DEFAULT now() NOT NULL,
	"url_pdf" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facture_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "paiement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commande_id" uuid NOT NULL,
	"type" "type_paiement" NOT NULL,
	"statut" "statut_paiement" DEFAULT 'EN_ATTENTE' NOT NULL,
	"montant_ttc_centimes" integer NOT NULL,
	"ventilation_tva" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_checkout_session_id" text,
	"confirme_par_webhook_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paiement_stripePaymentIntentId_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "substitution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commande_ligne_id" uuid NOT NULL,
	"produit_prevu_id" uuid NOT NULL,
	"produit_livre_id" uuid NOT NULL,
	"motif" "motif_substitution" NOT NULL,
	"commentaire" text,
	"ecart_valeur_centimes" integer NOT NULL,
	"operateur" text NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cgv_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cible" text NOT NULL,
	"version" text NOT NULL,
	"contenu" text NOT NULL,
	"entree_en_vigueur_le" timestamp with time zone NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cgv_version_unique" UNIQUE("cible","version")
);
--> statement-breakpoint
CREATE TABLE "consentement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"finalite" text NOT NULL,
	"base_legale" "base_legale_consentement" NOT NULL,
	"accorde" boolean NOT NULL,
	"preuve" text,
	"adresse_ip" text,
	"recueilli_le" timestamp with time zone DEFAULT now() NOT NULL,
	"retire_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evenement" text NOT NULL,
	"entite" text,
	"entite_id" uuid,
	"acteur" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "liste_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"annee_iso" smallint NOT NULL,
	"semaine_iso" smallint NOT NULL,
	"generee_le" timestamp with time zone DEFAULT now() NOT NULL,
	"generee_par" text,
	"nombre_commandes" integer DEFAULT 0 NOT NULL,
	"total_achat_ht_centimes" integer DEFAULT 0 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "liste_courses_semaine_unique" UNIQUE("annee_iso","semaine_iso")
);
--> statement-breakpoint
CREATE TABLE "liste_courses_ligne" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"liste_id" uuid NOT NULL,
	"producteur_id" uuid,
	"produit_id" uuid NOT NULL,
	"quantite_requise" integer NOT NULL,
	"quantite_a_commander" integer NOT NULL,
	"surplus" integer DEFAULT 0 NOT NULL,
	"prix_achat_unitaire_ht_centimes" integer,
	"total_achat_ht_centimes" integer,
	"commandee" boolean DEFAULT false NOT NULL,
	"recue" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parametre_moteur" (
	"cle" text PRIMARY KEY NOT NULL,
	"valeur" text,
	"unite" text,
	"description" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "disponibilite" ADD CONSTRAINT "disponibilite_produit_id_produit_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produit" ADD CONSTRAINT "produit_producteur_id_producteur_id_fk" FOREIGN KEY ("producteur_id") REFERENCES "public"."producteur"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produit_prix_histo" ADD CONSTRAINT "produit_prix_histo_produit_id_produit_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produit_score" ADD CONSTRAINT "produit_score_produit_id_produit_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produit_substitut" ADD CONSTRAINT "produit_substitut_produit_id_produit_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produit_substitut" ADD CONSTRAINT "produit_substitut_substitut_id_produit_id_fk" FOREIGN KEY ("substitut_id") REFERENCES "public"."produit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composition" ADD CONSTRAINT "composition_gabarit_id_gabarit_id_fk" FOREIGN KEY ("gabarit_id") REFERENCES "public"."gabarit"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composition" ADD CONSTRAINT "composition_contenant_id_contenant_id_fk" FOREIGN KEY ("contenant_id") REFERENCES "public"."contenant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composition_ligne" ADD CONSTRAINT "composition_ligne_composition_id_composition_id_fk" FOREIGN KEY ("composition_id") REFERENCES "public"."composition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composition_ligne" ADD CONSTRAINT "composition_ligne_produit_id_produit_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composition_ligne" ADD CONSTRAINT "composition_ligne_slot_id_gabarit_slot_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."gabarit_slot"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gabarit_slot" ADD CONSTRAINT "gabarit_slot_gabarit_id_gabarit_id_fk" FOREIGN KEY ("gabarit_id") REFERENCES "public"."gabarit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adresse" ADD CONSTRAINT "adresse_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commande" ADD CONSTRAINT "commande_devis_id_devis_id_fk" FOREIGN KEY ("devis_id") REFERENCES "public"."devis"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commande" ADD CONSTRAINT "commande_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commande" ADD CONSTRAINT "commande_adresse_livraison_id_adresse_id_fk" FOREIGN KEY ("adresse_livraison_id") REFERENCES "public"."adresse"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commande" ADD CONSTRAINT "commande_adresse_facturation_id_adresse_id_fk" FOREIGN KEY ("adresse_facturation_id") REFERENCES "public"."adresse"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commande_ligne" ADD CONSTRAINT "commande_ligne_commande_id_commande_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commande"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commande_ligne" ADD CONSTRAINT "commande_ligne_produit_id_produit_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commande_ligne" ADD CONSTRAINT "commande_ligne_composition_id_composition_id_fk" FOREIGN KEY ("composition_id") REFERENCES "public"."composition"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destinataire" ADD CONSTRAINT "destinataire_commande_mere_id_commande_id_fk" FOREIGN KEY ("commande_mere_id") REFERENCES "public"."commande"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destinataire" ADD CONSTRAINT "destinataire_commande_fille_id_commande_id_fk" FOREIGN KEY ("commande_fille_id") REFERENCES "public"."commande"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devis" ADD CONSTRAINT "devis_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devis_composition" ADD CONSTRAINT "devis_composition_devis_id_devis_id_fk" FOREIGN KEY ("devis_id") REFERENCES "public"."devis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devis_composition" ADD CONSTRAINT "devis_composition_composition_id_composition_id_fk" FOREIGN KEY ("composition_id") REFERENCES "public"."composition"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facture" ADD CONSTRAINT "facture_commande_id_commande_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commande"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facture" ADD CONSTRAINT "facture_paiement_id_paiement_id_fk" FOREIGN KEY ("paiement_id") REFERENCES "public"."paiement"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paiement" ADD CONSTRAINT "paiement_commande_id_commande_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commande"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitution" ADD CONSTRAINT "substitution_commande_ligne_id_commande_ligne_id_fk" FOREIGN KEY ("commande_ligne_id") REFERENCES "public"."commande_ligne"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitution" ADD CONSTRAINT "substitution_produit_prevu_id_produit_id_fk" FOREIGN KEY ("produit_prevu_id") REFERENCES "public"."produit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitution" ADD CONSTRAINT "substitution_produit_livre_id_produit_id_fk" FOREIGN KEY ("produit_livre_id") REFERENCES "public"."produit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liste_courses_ligne" ADD CONSTRAINT "liste_courses_ligne_liste_id_liste_courses_id_fk" FOREIGN KEY ("liste_id") REFERENCES "public"."liste_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liste_courses_ligne" ADD CONSTRAINT "liste_courses_ligne_producteur_id_producteur_id_fk" FOREIGN KEY ("producteur_id") REFERENCES "public"."producteur"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liste_courses_ligne" ADD CONSTRAINT "liste_courses_ligne_produit_id_produit_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "disponibilite_semaine_idx" ON "disponibilite" USING btree ("annee_iso","semaine_iso","disponible");--> statement-breakpoint
CREATE INDEX "producteur_nom_idx" ON "producteur" USING btree ("nom");--> statement-breakpoint
CREATE INDEX "produit_categorie_idx" ON "produit" USING btree ("categorie");--> statement-breakpoint
CREATE INDEX "produit_producteur_idx" ON "produit" USING btree ("producteur_id");--> statement-breakpoint
CREATE INDEX "produit_actif_idx" ON "produit" USING btree ("actif");--> statement-breakpoint
CREATE INDEX "produit_regime_alcool_idx" ON "produit" USING btree ("regime_alcool");--> statement-breakpoint
CREATE INDEX "produit_gamme_idx" ON "produit" USING btree ("niveau_gamme");--> statement-breakpoint
CREATE INDEX "produit_prix_histo_produit_idx" ON "produit_prix_histo" USING btree ("produit_id","applicable_du");--> statement-breakpoint
CREATE INDEX "produit_substitut_produit_idx" ON "produit_substitut" USING btree ("produit_id");--> statement-breakpoint
CREATE INDEX "composition_empreinte_idx" ON "composition" USING btree ("empreinte");--> statement-breakpoint
CREATE INDEX "composition_gabarit_idx" ON "composition" USING btree ("gabarit_id");--> statement-breakpoint
CREATE INDEX "composition_ligne_produit_idx" ON "composition_ligne" USING btree ("produit_id");--> statement-breakpoint
CREATE INDEX "adresse_client_idx" ON "adresse" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "client_type_idx" ON "client" USING btree ("type");--> statement-breakpoint
CREATE INDEX "commande_etat_idx" ON "commande" USING btree ("etat");--> statement-breakpoint
CREATE INDEX "commande_semaine_idx" ON "commande" USING btree ("annee_iso","semaine_iso");--> statement-breakpoint
CREATE INDEX "commande_mere_idx" ON "commande" USING btree ("commande_mere_id");--> statement-breakpoint
CREATE INDEX "commande_ligne_commande_idx" ON "commande_ligne" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "commande_ligne_produit_idx" ON "commande_ligne" USING btree ("produit_id");--> statement-breakpoint
CREATE INDEX "destinataire_commande_idx" ON "destinataire" USING btree ("commande_mere_id");--> statement-breakpoint
CREATE INDEX "devis_etat_idx" ON "devis" USING btree ("etat");--> statement-breakpoint
CREATE INDEX "devis_client_idx" ON "devis" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "devis_cree_le_idx" ON "devis" USING btree ("cree_le");--> statement-breakpoint
CREATE INDEX "facture_commande_idx" ON "facture" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "paiement_commande_idx" ON "paiement" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "substitution_ligne_idx" ON "substitution" USING btree ("commande_ligne_id");--> statement-breakpoint
CREATE INDEX "consentement_email_idx" ON "consentement" USING btree ("email");--> statement-breakpoint
CREATE INDEX "journal_audit_evenement_idx" ON "journal_audit" USING btree ("evenement","cree_le");--> statement-breakpoint
CREATE INDEX "journal_audit_entite_idx" ON "journal_audit" USING btree ("entite","entite_id");--> statement-breakpoint
CREATE INDEX "liste_courses_ligne_liste_idx" ON "liste_courses_ligne" USING btree ("liste_id");--> statement-breakpoint
CREATE INDEX "liste_courses_ligne_producteur_idx" ON "liste_courses_ligne" USING btree ("producteur_id");