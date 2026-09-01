# Schéma de base de données — plateforme coffrets & paniers garnis

Schéma cible PostgreSQL / Supabase. Il reprend le découpage en tables distinctes
demandé, et se remplit à partir de `data/base-produits-noel/export/*.csv`.

Conventions : `snake_case`, clés primaires `uuid`, montants en `numeric(10,4)` HT,
TVA en taux décimal (`0.055`, `0.20`), poids en grammes, dimensions en millimètres.
Tout champ non documenté est `NULL` + un champ `*_statut` valant `A_CONFIRMER` :
**aucune valeur par défaut inventée**.

## 1. Catalogue

```sql
-- Fournisseurs : distributeurs, fabricants et producteurs référencés
create table suppliers (
  id                    uuid primary key default gen_random_uuid(),
  code                  text unique not null,          -- FOUR-0001
  nom                   text not null,
  role                  text not null,                 -- DISTRIBUTEUR | FABRICANT | PRODUCTEUR | PRODUCTEUR_REFERENCE
  canal_de_commande     text,
  regroupement_suggere  text,                          -- proposé, jamais appliqué
  contact_nom           text, telephone text, email text, site_internet text,
  adresse text, code_postal text, ville text, region text, departement text,
  identifiants_legaux   text,
  conditions_paiement   text, livraison text, retrait text,
  minimum_commande      text, personnalisation text, delais text,
  autres_infos          text,
  source                text not null,                 -- traçabilité documentaire
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table product_categories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, libelle text not null,
  parent_id uuid references product_categories(id)
);

create table products (
  id                      uuid primary key default gen_random_uuid(),
  code                    text unique not null,        -- PROD-0001
  reference_fournisseur   text,
  nom                     text not null,
  libelle_source          text not null,               -- libellé exact du document
  description             text,
  category_id             uuid references product_categories(id),
  sous_categorie          text,
  marque                  text,
  producteur_id           uuid references suppliers(id),
  fournisseur_id          uuid references suppliers(id) not null,
  -- origine (voir README de la base pour les niveaux de preuve)
  origine_pays text, origine_region text, origine_departement text,
  lieu_fabrication text, appellation text,
  niveau_preuve_origine   text not null,
  caractere_local         text,
  savoir_faire_francais   text,
  -- caractéristiques
  poids_net_g numeric(10,2), volume_ml numeric(10,2),
  degre_alcool text, alcool text not null,             -- OUI | NON | INGREDIENT_ALCOOLISE
  type_alcool text, dlc_ddm text,
  -- prix
  prix_achat_ht numeric(10,4), unite_de_prix text, prix_au_kg_ht numeric(10,4),
  droits_accises numeric(10,4), prix_hors_droits_ht numeric(10,4),
  tva_taux numeric(5,4),
  prix_vente_ht numeric(10,4),                         -- À SAISIR : absent des documents
  prix_min_acceptable numeric(10,4), prix_max_conseille numeric(10,4),
  -- conditionnement
  conditionnement text, quantite_par_conditionnement integer,
  multiple_commande integer, minimum_commande text, panachage text,
  -- logistique  (dimensions : À SAISIR, absentes des documents)
  poids_brut_g numeric(10,2),
  longueur_mm integer, largeur_mm integer, hauteur_mm integer,
  fragile text, contient_verre text, liquide text,
  protection_necessaire text, protection_type text, contraintes_transport text,
  -- personnalisation
  personnalisable text, type_personnalisation text,
  cout_personnalisation numeric(10,4), delai_personnalisation text,
  fournisseur_personnalisation_id uuid references suppliers(id),
  -- commercial
  niveau_gamme text, niveau_noblesse smallint check (niveau_noblesse between 1 and 5),
  noblesse_justification text, noblesse_source text,   -- AUTO | VALIDE_ADMIN
  saisonnalite text, produit_noel boolean,
  -- disponibilité
  disponibilite text not null,                         -- STOCK | CHEZ_FOURNISSEUR | SUR_COMMANDE | DELAI_A_CONFIRMER | INDISPONIBLE
  delai_fournisseur text,
  actif boolean default true,
  -- qualité des données
  statut_ligne text default 'PRODUIT',
  doublon_potentiel text, conflit_prix text, anomalie_source text,
  source text not null, ligne_source text not null,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index on products (category_id);
create index on products (fournisseur_id);
create index on products (alcool, disponibilite) where actif;
```

## 2. Prix, remises, personnalisation

```sql
-- Historise chaque prix relevé, avec le libellé exact de la colonne source
create table product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  prix_achat_ht numeric(10,4), unite_de_prix text, tva_taux numeric(5,4),
  texte_exact_du_document text, libelle_colonne_source text,
  type_de_document text,                               -- TARIF | FACTURE
  valide_du date, valide_au date,
  source text not null, ligne_source text not null
);

-- Aucune règle n'est codée en dur : tout vient de cette table
create table discount_rules (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                           -- REM-0001
  type text not null,                                  -- PALIER_QUANTITATIF | DEDUCTION | AVANTAGE
  portee text not null,                                -- PRODUIT | FOURNISSEUR | COMMANDE | CATEGORIE
  supplier_id uuid references suppliers(id),
  product_id  uuid references products(id),
  type_client text,                                    -- PARTICULIER | PROFESSIONNEL | TOUS
  quantite_min integer, quantite_max integer,
  montant_min numeric(10,2),
  valeur_remise numeric(10,4), unite_remise text,      -- POURCENT | EURO | PRIX_FIXE
  texte_exact_du_document text not null,
  source text not null,
  actif boolean default true
);

create table personalization_options (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, libelle text not null,
  famille text not null,                               -- RAPIDE_INTERNE | FOURNISSEUR
  delai_jours integer, cout_ht numeric(10,4),
  supplier_id uuid references suppliers(id),
  product_id uuid references products(id),
  disponible boolean default false,                    -- false tant que non documenté
  commentaire text, source text
);
```

## 3. Moteur : scores, alternatives, opportunités

```sql
create table product_scores (
  product_id uuid primary key references products(id) on delete cascade,
  score_noblesse smallint, score_valeur_percue smallint, score_qualite smallint,
  score_local smallint, score_noel smallint, score_logistique smallint,
  score_marge smallint, score_personnalisation smallint, score_upsell smallint,
  base_de_calcul text, statut text default 'AUTO',     -- AUTO | VALIDE_ADMIN
  updated_at timestamptz default now()
);

create table product_opportunities (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  tag text not null,                                   -- FORTE_MARGE, UPSELL, PRODUIT_LOCAL_EMBLEMATIQUE…
  origine_du_tag text, statut text default 'A_VALIDER',
  unique (product_id, tag)
);

create table product_alternatives (
  id uuid primary key default gen_random_uuid(),
  product_id     uuid references products(id) on delete cascade,
  alternative_id uuid references products(id) on delete cascade,
  relation_prix text, ecart_prix_pct numeric(6,2), ecart_noblesse smallint,
  meme_sous_categorie boolean, meme_regime_alcool boolean,
  meme_region_documentee boolean, meme_producteur boolean,
  critere_de_rapprochement text,
  priorite smallint,
  unique (product_id, alternative_id)
);
```

## 4. Emballages, protections, transport

```sql
create table packaging_suppliers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, nom text not null,
  site_internet text, contact text, conditions text,
  minimum_commande text, delai text, source text
);

create table packagings (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, reference text,
  packaging_supplier_id uuid references packaging_suppliers(id),
  nom text not null, type text not null,               -- coffret carton, boîte rigide, panier…
  longueur_mm integer, largeur_mm integer, hauteur_mm integer,
  volume_utile_dm3 numeric(10,3), poids_g numeric(10,2),
  prix_achat_ht numeric(10,4), quantite_par_conditionnement integer,
  prix_unitaire_ht numeric(10,4),
  niveau_gamme text,                                   -- ESSENTIEL | SIGNATURE | PRESTIGE
  capacite_bouteilles smallint, capacite_pots smallint, nb_produits_max smallint,
  delai text, stock integer, minimum_commande integer,
  source text, actif boolean default true
);

create table packaging_protections (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, nom text not null, type text not null,
  declencheur text not null,                           -- VERRE | BOUTEILLE | FRAGILE | MULTI_FRAGILE
  cout_unitaire_ht numeric(10,4), poids_g numeric(10,2),
  packaging_id uuid references packagings(id), source text
);

create table shipping_rates (
  id uuid primary key default gen_random_uuid(),
  transporteur text not null, service text not null, zone text not null,
  poids_min_kg numeric(8,3), poids_max_kg numeric(8,3),
  tarif_ht numeric(10,4), supplement numeric(10,4),
  longueur_max_mm integer, largeur_max_mm integer, hauteur_max_mm integer,
  diviseur_poids_volumetrique integer, assurance numeric(10,4),
  delai_jours integer, actif boolean default true, source text
);
```

## 5. Coffrets

```sql
create table gift_boxes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                           -- COF-0001
  nom text not null,
  type text not null,                                  -- FOURNISSEUR | COMPOSITION_INTERNE | GABARIT
  gamme text,                                          -- ESSENTIEL | SIGNATURE | PRESTIGE
  supplier_id uuid references suppliers(id),
  packaging_id uuid references packagings(id),
  -- coûts recalculés, jamais saisis à la main
  cout_produits_ht numeric(10,4), cout_emballage_ht numeric(10,4),
  cout_protection_ht numeric(10,4), cout_personnalisation_ht numeric(10,4),
  cout_preparation_ht numeric(10,4), cout_transport_ht numeric(10,4),
  cout_revient_total_ht numeric(10,4),
  prix_vente_ht numeric(10,4), remise numeric(10,4), prix_final_ht numeric(10,4),
  marge_eur numeric(10,4), taux_marge numeric(6,4),
  poids_total_g numeric(10,2),
  longueur_mm integer, largeur_mm integer, hauteur_mm integer,
  avec_alcool boolean, part_produits_locaux numeric(5,4),
  actif boolean default true, source text
);

create table gift_box_items (
  id uuid primary key default gen_random_uuid(),
  gift_box_id uuid references gift_boxes(id) on delete cascade,
  product_id uuid references products(id),
  quantite integer not null default 1,
  role_dans_le_coffret text,                           -- PIECE_MAITRESSE | SIGNATURE | BASE | EXTRA
  remplacable boolean default true
);

-- Règles de composition, éditables en back-office
create table gift_box_rules (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, libelle text not null,
  type text not null,               -- COMPATIBILITE | QUOTA_CATEGORIE | EXCLUSION | POIDS_MAX | BUDGET
  gamme text, categorie text, sous_categorie text,
  valeur_min numeric(10,4), valeur_max numeric(10,4),
  priorite smallint default 100, actif boolean default true, commentaire text
);

-- Tous les paramètres économiques et logistiques : rien en dur dans le code
create table engine_parameters (
  cle text primary key, valeur text, unite text, description text,
  modifiable_en_back_office boolean default true, updated_at timestamptz default now()
);
```

## 6. Clients, devis, commandes, expéditions

```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,                            -- Supabase Auth
  type text not null,                                  -- PARTICULIER | PROFESSIONNEL
  email text not null, telephone text,
  nom text, prenom text,
  raison_sociale text, siret text, tva_intracom text,
  created_at timestamptz default now()
);

create table customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  type text not null,                                  -- FACTURATION | LIVRAISON
  libelle text, destinataire text, ligne1 text, ligne2 text,
  code_postal text, ville text, pays text default 'France'
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,                         -- MD-DEV-2026-000123
  customer_id uuid references customers(id),
  statut text not null,                                -- BROUILLON | ENVOYE | ACCEPTE | SIGNE | REFUSE | EXPIRE
  besoin jsonb,                                        -- réponses du questionnaire
  total_produits_ht numeric(12,4), total_emballage_ht numeric(12,4),
  total_preparation_ht numeric(12,4), total_transport_ht numeric(12,4),
  total_remise numeric(12,4), total_ht numeric(12,4),
  total_tva numeric(12,4), total_ttc numeric(12,4),
  marge_estimee_eur numeric(12,4), taux_marge_estime numeric(6,4),
  valide_jusqu_au date, pdf_url text,
  signature_provider text, signature_id text, signe_le timestamptz,
  created_at timestamptz default now()
);

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id) on delete cascade,
  gift_box_id uuid references gift_boxes(id),
  product_id uuid references products(id),
  type_ligne text not null,                            -- COFFRET | OPTION | PERSONNALISATION | TRANSPORT
  libelle text not null, quantite integer not null,
  prix_unitaire_ht numeric(10,4), tva_taux numeric(5,4),
  remise numeric(10,4), total_ht numeric(12,4),
  cout_revient_unitaire_ht numeric(10,4)               -- jamais exposé au client
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,                         -- MD-CMD-2026-000123
  quote_id uuid references quotes(id),
  customer_id uuid references customers(id),
  statut text not null,   -- VALIDEE | RESERVATION | APPROVISIONNEMENT | RECEPTION | PREPARATION
                          -- | PERSONNALISATION | EMBALLAGE | EXPEDIEE | EN_LIVRAISON | LIVREE
  date_livraison_souhaitee date,
  total_ht numeric(12,4), total_tva numeric(12,4), total_ttc numeric(12,4),
  marge_reelle_eur numeric(12,4),
  created_at timestamptz default now()
);
create table order_items      (like quote_items including all);
create table order_packaging  (id uuid primary key default gen_random_uuid(),
                               order_id uuid references orders(id) on delete cascade,
                               packaging_id uuid references packagings(id),
                               quantite integer, cout_ht numeric(10,4));
create table order_shipping   (id uuid primary key default gen_random_uuid(),
                               order_id uuid references orders(id) on delete cascade,
                               shipping_rate_id uuid references shipping_rates(id),
                               adresse_id uuid references customer_addresses(id),
                               poids_reel_kg numeric(8,3), poids_volumetrique_kg numeric(8,3),
                               cout_ht numeric(10,4), cout_facture_client_ht numeric(10,4));

create table shipping_packages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  numero_colis text, transporteur text, lien_de_suivi text,
  statut text, nb_coffrets integer,
  poids_kg numeric(8,3),
  expedie_le timestamptz, livraison_estimee date, livre_le timestamptz
);
create table tracking_events (
  id uuid primary key default gen_random_uuid(),
  shipping_package_id uuid references shipping_packages(id) on delete cascade,
  order_id uuid references orders(id),
  statut text not null, libelle text, horodatage timestamptz default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id), quote_id uuid references quotes(id),
  provider text not null default 'stripe',
  provider_payment_id text,                            -- aucune donnée bancaire stockée
  type text not null,                                  -- ACOMPTE | SOLDE | INTEGRAL
  montant_ttc numeric(12,4), statut text, paye_le timestamptz
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null, order_id uuid references orders(id),
  total_ht numeric(12,4), total_tva numeric(12,4), total_ttc numeric(12,4),
  pdf_url text, emise_le date
);
```

## 7. Stock et approvisionnement

```sql
create table stock (
  product_id uuid primary key references products(id) on delete cascade,
  stock_interne integer default 0,
  stock_reserve integer default 0,
  stock_disponible integer generated always as (stock_interne - stock_reserve) stored,
  stock_fournisseur text, delai_fournisseur_jours integer,
  seuil_alerte integer, updated_at timestamptz default now()
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  type text not null,                                  -- ENTREE | SORTIE | RESERVATION | LIBERATION
  quantite integer not null, order_id uuid references orders(id),
  lot text, date_achat date, date_reception date,      -- traçabilité
  commentaire text, created_at timestamptz default now()
);

create table supplier_orders (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null, supplier_id uuid references suppliers(id),
  statut text not null, total_ht numeric(12,4),
  date_commande date, date_reception_prevue date, date_reception date
);
create table supplier_order_items (
  id uuid primary key default gen_random_uuid(),
  supplier_order_id uuid references supplier_orders(id) on delete cascade,
  product_id uuid references products(id),
  quantite_commandee integer, quantite_recue integer,
  prix_unitaire_ht numeric(10,4), lot text
);

create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid, action text not null, table_cible text,
  enregistrement_id uuid, avant jsonb, apres jsonb,
  created_at timestamptz default now()
);
```

## 8. Sécurité (RLS)

- `products`, `suppliers`, `packagings`, `shipping_rates`, `engine_parameters`,
  `discount_rules`, `product_scores` : **lecture publique interdite**. Le prix d'achat,
  la marge et le coût de revient ne doivent jamais être exposés côté client — les pages
  publiques passent par des vues ne projetant que les champs de vente.
- `customers`, `quotes`, `orders`, `shipping_packages` : RLS `auth.uid() = customer.auth_user_id`.
- Back-office : rôle `admin` distinct, routes séparées, toute écriture tracée dans `admin_audit_log`.
- Aucune donnée bancaire stockée : seuls les identifiants Stripe sont conservés.
