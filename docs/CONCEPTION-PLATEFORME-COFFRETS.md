# Conception — plateforme coffrets & paniers garnis

Document d'analyse préalable demandé avant tout développement. Aucune ligne de site
n'a été écrite. Il s'appuie exclusivement sur les données reconstituées dans
`data/base-produits-noel/` et signale chaque donnée manquante par **INFORMATION À FOURNIR**.

---

## 1. Ce que les données permettent déjà — et ce qu'elles ne permettent pas

| Brique | Faisable aujourd'hui | Bloqué par |
|---|---|---|
| Catalogue produits | ✅ 702 produits, 32 fournisseurs, 702 prix d'achat | — |
| Filtre avec / sans alcool | ✅ 139 / 530 (+ 33 « alcool comme ingrédient » à arbitrer) | — |
| Filtre local | ⚠️ 68 produits normands prouvés seulement | Adresses des 28 producteurs |
| Alternatives / substitution | ✅ 3 020 paires calculées | — |
| Composition d'un coffret par budget | ⚠️ possible sur le **coût d'achat** | Prix de vente |
| Prix de vente et marge | ❌ | **Prix de vente : INFORMATION À FOURNIR** |
| Coût d'emballage | ❌ | **Tarifs RETIF / RAJA : INFORMATION À FOURNIR** |
| Choix automatique de l'emballage | ❌ | **Dimensions produits : INFORMATION À FOURNIR** |
| Coût de transport | ❌ | **Grille transporteur : INFORMATION À FOURNIR** |
| Coût de préparation | ❌ | **Temps et taux horaire : INFORMATION À FOURNIR** |
| Personnalisation vendable | ❌ | Aucun document n'en mentionne — **INFORMATION À FOURNIR** |
| Stock | ❌ | Aucune donnée de stock — **INFORMATION À FOURNIR** |
| Identité visuelle | ❌ | **Image de référence non reçue : INFORMATION À FOURNIR** |

**Conséquence sur le planning :** le moteur de recommandation peut être développé et
testé dès maintenant (il travaille sur des règles + le coût d'achat), mais il ne pourra
pas afficher de prix client tant que les 5 données économiques ci-dessus ne sont pas
saisies. Le back-office de saisie doit donc venir **avant** la mise en ligne du parcours client.

## 2. Règles de prix et de remise — reprises telles quelles

Aucune règle n'est codée en dur. Les 5 règles réellement présentes dans les documents
sont chargées dans `discount_rules` :

| Code | Type | Règle documentée |
|---|---|---|
| REM-0001 / REM-0002 | Palier quantitatif | Boutons de la Manche 250 g : 3,60 € HT à l'unité, **3,45 € HT par carton de 12** (−4,17 %) |
| REM-0003 | Déduction sur facture | Domaine de Brucan : −46,62 € HT sur 466,20 € HT, soit exactement 10 %. **Libellé absent du document — à confirmer** |
| AVA-0001 | Échantillon | Distillerie C'est Nous : échantillon gratuit pour 6 bouteilles, sur demande |
| AVA-0002 | Emballage offert | POM' POM' : coffret 2 × 20 cl facturé 0,00 € avec l'achat de 20 cl |

**Il n'existe aucune grille 1-49 / 50-99 / 100-199 dans les documents fournis.**
Le moteur de remise est écrit pour la supporter (bornes `quantite_min` / `quantite_max`
dans `discount_rules`), mais aucune ligne de ce type n'a été créée.

Sept conditions supplémentaires (panachage, expédition, minimums) sont dans
`CONDITIONS_FOURNISSEURS` et contraignent la commande fournisseur, pas le prix client —
par exemple : *Brasserie La Lie : expédition par transporteur uniquement à partir de
8 cartons* ou *SKINFAXI : minimum de commande de 6 bouteilles*.

## 3. Calcul du prix — chaîne complète

Le transport est isolé de la marge produit, comme demandé :

```
COÛT DE REVIENT                          PRIX CLIENT
  coût produits HT                         prix produits HT
+ emballage                              + emballage facturé
+ protections / calage                   + personnalisation
+ personnalisation                       − remise (discount_rules)
+ préparation (temps × taux horaire)     = TOTAL HT
+ autres coûts directs                   + transport (refacturé au coût réel)
= COÛT DE REVIENT COMPLET                + TVA (5,5 % ou 20 % par ligne)
                                         = TOTAL TTC
MARGE = TOTAL HT (hors transport) − COÛT DE REVIENT (hors transport)
```

La TVA est portée par la ligne, pas par la commande : un coffret mixte mélange 5,5 %
(alimentaire) et 20 % (alcool, caramels, cosmétique). Le détail de chaque composante est
conservé dans `quote_items` / `order_items` pour l'analyse de rentabilité.

## 4. Moteur de composition — logique

**Hiérarchie de décision** (paramètre `PRIORITE_MOTEUR`, modifiable) :
besoin client → budget → cohérence du coffret → qualité perçue → niveau de gamme →
disponibilité → logistique → **marge en dernier**. La marge pondère le choix entre
produits équivalents ; elle ne peut jamais imposer un produit incohérent.

**Algorithme :**
1. **Filtrage dur** — régime alcool, budget, disponibilité, quotas de catégorie
   (`gift_box_rules`). Un coffret « sans alcool » exclut `alcool = OUI` ; les 33 produits
   `INGREDIENT_ALCOOLISE` sont inclus ou exclus selon un paramètre explicite.
2. **Squelette par gamme** — Essentiel 3 produits / Signature 4 + 1 produit artisanal /
   Prestige 5 + 1 pièce maîtresse (niveau de noblesse 4-5).
3. **Sélection** — score composite = pertinence client (préférences, local, valeur perçue)
   × cohérence (catégories complémentaires, pas deux fois la même sous-catégorie)
   × faisabilité (disponibilité, logistique), la marge n'intervenant qu'en départage.
4. **Emballage** — le plus petit `packaging` compatible (volume, nombre de produits,
   niveau de gamme) ; protections déclenchées produit par produit (`contient_verre`,
   `fragile`), puis carton d'expédition et poids expédié.
5. **Ajustement au budget** — si le total dépasse, trois sorties sont proposées plutôt
   qu'un échec : retirer un petit produit, substituer via `product_alternatives`,
   ou proposer une composition voisine. Jamais de message « budget impossible ».
6. **Trois offres** — l'écart Essentiel → Signature est calculé pour rester faible
   quand c'est économiquement pertinent, afin que Signature (« LE PLUS CHOISI ») soit
   le choix naturel. L'écart Signature → Prestige reste plus marqué.

**Modes de préférence** : « respecter mon budget » (budget en contrainte dure),
« je veux le plus beau » (poids accru sur noblesse, artisanat, local),
« forte valeur perçue » (packaging premium, pièce maîtresse, contraste des produits).

**Substitution en rupture** : `product_alternatives` fournit déjà des candidats
(même sous-catégorie, même régime alcool, écart ≤ 40 %), classés par écart de prix,
de noblesse, et par région documentée.

**Couche IA** : le moteur reste déterministe et auditable. Un LLM peut habiller les
propositions (nom du coffret, argumentaire, formulation des extras) et interpréter une
demande en langage libre, mais **ne choisit jamais un produit hors des candidats
retournés par le moteur** et ne peut inventer ni produit, ni prix, ni disponibilité.

## 5. Arborescence du site

```
/                                  choix Particulier / Entreprise
/particulier/questionnaire         occasion, budget, quantité, préférences
/entreprise/questionnaire          société, contact, quantité, budget, destinataires, alcool, livraison
/propositions                      les 3 offres — Signature mise en avant
/coffret/[id]                      détail, composition, provenance, substitution
/personnaliser                     extras, carte, emballage, personnalisation
/recapitulatif                     produits, options, remise, préparation, transport, TVA
/devis/[numero]                    consultation, acceptation, signature, paiement
/commande/[numero]/suivi           timeline + colis
/compte                            commandes, devis, factures, adresses, destinataires, recommander
/nos-producteurs                   traçabilité et savoir-faire (positionnement)
/coffrets/[categorie]              pages SEO
/blog/[slug]
/admin/*                           back-office, domaine et authentification séparés
```

## 6. Parcours

**Particulier** — 4 questions maximum (occasion, budget, quantité, préférences),
puis les 3 propositions. Retour arrière possible à chaque étape, réponses conservées.

**Entreprise** — identité + besoin en un seul écran découpé en sections, puis les
3 propositions calculées pour la quantité demandée (les paliers de remise s'appliquent
au volume). Livraison mono-adresse ou multi-adresses, devis PDF, signature, paiement
ou acompte.

Aucun formulaire « nous vous rappellerons » : le client va jusqu'au paiement seul.

## 7. Back-office

Dashboard (CA, panier moyen, marge brute, taux de marge, coûts, produits les plus
rentables, évolution mensuelle) · Commandes · Produits · Fournisseurs · Emballages ·
Transport · Remises · Stock · Commandes fournisseurs (« il manque 32 unités pour les
commandes validées ») · **Opportunités** (forte marge, forte valeur perçue, produits
lourds à faible marge, produits substituables, stock faible) · Paramètres du moteur.

Tout ce qui a un impact économique ou logistique est éditable : noblesse, scores,
marges, prix, coûts d'emballage, de protection et de préparation, poids, dimensions,
règles de transport, alternatives, règles d'upsell et de priorité, saisonnalité.

## 8. Architecture technique

Next.js (App Router) + TypeScript · PostgreSQL via Supabase (RLS) · Tailwind ·
Supabase Auth avec rôle `admin` séparé · Stripe (aucune donnée bancaire stockée) ·
génération PDF côté serveur · emails transactionnels · signature électronique en
intégration tierce (jamais de faux dispositif de signature).

Le moteur de composition est un **module isolé et testable** (`lib/engine/`), sans accès
direct au HTTP : entrées = besoin client + catalogue + paramètres, sortie = 3 propositions
chiffrées. C'est la seule façon de garantir qu'il reste piloté par les données.

## 9. Plan de développement par étapes

| Étape | Contenu | Prérequis |
|---|---|---|
| **0. Terminée** | Reconstitution de la base : 702 produits, 32 fournisseurs, tarifs, remises, doublons, conflits, contrôle qualité | — |
| **1** | Schéma en base + import des CSV + back-office de **saisie** (prix de vente, dimensions, emballages, transport, préparation, stock) | — |
| **2** | Moteur de composition en module isolé, testé sur le catalogue réel | Étape 1 renseignée |
| **3** | Parcours client : questionnaires, 3 propositions, extras, récapitulatif | Étape 2 + identité visuelle |
| **4** | Devis PDF, acceptation, signature électronique | Étape 3 |
| **5** | Paiement Stripe, numéro de commande, emails transactionnels | Étape 4 |
| **6** | Suivi de commande et de colis, espace client | Étape 5 |
| **7** | Back-office complet : rentabilité, opportunités, commandes fournisseurs, stock | Étape 5 |
| **8** | SEO, blog, pages producteurs, données structurées | Étape 3 |
| **9** | Couche IA (argumentaires, demande en langage libre, aide à la composition) | Étape 2 |

## 10. Récapitulatif — INFORMATION À FOURNIR

1. **Prix de vente** (ou taux de marge cible par gamme) — bloque tout affichage de prix.
2. **Image de référence de l'identité visuelle** — annoncée, non reçue.
3. **Tarifs emballages** (RETIF, RAJA ou autre) : référence, prix, conditionnement, dimensions, poids.
4. **Grille transporteur** : transporteur, service, zone, tranches de poids, tarif, poids volumétrique.
5. **Dimensions et poids brut des produits** — absents de tous les documents.
6. **Temps et coût de préparation** par type de coffret.
7. **Adresses des 28 producteurs** — débloquerait l'origine de 612 produits.
8. **Conditions de personnalisation** par fournisseur (type, délai, coût, minimum).
9. **Données de stock** et seuils d'alerte.
10. **Canal de commande Caramels d'Isigny** : direct ou via Normand Direct Terroir ?
11. **Nature de la déduction de 10 %** sur la facture Domaine de Brucan.
12. **Arbitrage sur les 33 produits contenant de l'alcool comme ingrédient** : acceptés
    ou non dans un coffret « sans alcool » ?
13. **Nom définitif de l'entreprise** — « Maison des Chatonniers » est cité comme
    inspiration, non comme nom retenu.
