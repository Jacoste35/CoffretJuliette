# Comptoir des Chatonniers — Architecture WordPress / WooCommerce

**Étape 1 uniquement.** Aucune ligne de code du plugin n'a été écrite. Ce document
pose les questions manquantes, challenge le concept, propose l'architecture complète
et l'algorithme en pseudo-code, puis liste les extensions. Développement à partir de
votre validation, fonctionnalité par fonctionnalité.

---

# 1. Questions à trancher avant de coder

Les six premières sont bloquantes : elles changent l'architecture, pas seulement le code.

## 1.1 Bloquantes

**Q1 — Le coffret sur la facture : une ligne ou N lignes ?**
Votre règle « TVA par ligne, 20 % alcool / 5,5 % alimentaire / 20 % accessoires » est
incompatible avec un coffret vendu comme un produit unique : un produit WooCommerce
porte **une seule** classe de TVA. Deux options, et il faut choisir maintenant :

- **A — Le coffret est éclaté en lignes de commande** (un produit = une ligne, plus une
  ligne emballage). TVA native, exacte, auditable ; la liste de courses hebdomadaire
  tombe toute seule. Le client voit un détail qu'on peut regrouper visuellement.
- **B — Le coffret est un produit unique** avec un taux moyen pondéré. Simple à
  afficher, **mais le taux moyen n'est pas légal** : l'administration attend la
  ventilation par taux. À écarter, sauf contre-argument de votre comptable.

Je recommande **A**, avec un affichage regroupé côté client (« Coffret Le Normand »
puis le détail replié). Confirmez-vous ?

**Q2 — Substitution invisible : que porte la facture ?**
« Le nom du produit de remplacement ne doit jamais apparaître côté client » pose trois
problèmes réels :
1. **Facture** — elle doit décrire ce qui est effectivement livré. Une facture portant
   « produit équivalent » pour un bien identifiable est contestable.
2. **Allergènes** — vous vendez de l'alimentaire. Vous devez pouvoir communiquer la
   composition de ce qui est dans le colis. Un client allergique aux fruits à coque à
   qui on substitue un nougat sans le dire, c'est un risque sanitaire, pas un détail
   d'UX.
3. **B2C** — le consommateur doit être informé d'une modification du bien commandé.

Ma proposition : la mention générique reste **pendant la phase de vente** (devis,
propositions, page de suivi), le **bon de livraison et la facture nomment le produit
réel**, et un e-mail informe de la substitution. Est-ce acceptable ? Si vous
maintenez l'anonymat jusqu'au bout, il me faut un écrit de votre part, car cela
m'écarte de ce que je considère défendable.

**Q3 — La grille de remises B2B dégressives n'existe pas.**
Vous demandez des « prix B2B dégressifs par volume ». **Aucun de vos documents
fournisseurs n'en contient**, et je n'en inventerai pas. Il me faut vos paliers :
à partir de combien de coffrets, quel pourcentage, et sur quelle assiette (produits
seuls, ou produits + emballage, transport exclu).

**Q4 — Multi-destinataires : une commande ou plusieurs ?**
WooCommerce ne gère **qu'une adresse de livraison par commande**. Pour 80 cadeaux vers
80 adresses, trois modèles :
- une commande mère + N expéditions (table custom) → **une facture**, un paiement, un
  suivi par colis. C'est ce que je recommande.
- N commandes filles → natif pour l'expédition, mais N factures et un rapprochement
  comptable pénible.
- Export CSV vers le transporteur, hors Woo → simple, mais pas de suivi dans le site.

Quel volume réel de multi-adresses attendez-vous ? Une dizaine par an ou la moitié des
commandes ? La réponse change le niveau d'investissement.

**Q5 — Acompte : quel pourcentage, et à quel moment ?**
Acompte à l'acceptation du devis puis solde à l'expédition ? Quel taux (30 % ?) ?
Au-dessus de quel montant ? Un acompte non remboursable a des implications en B2C.

**Q6 — Transport : qui, comment, à quel tarif ?**
Rien n'est décidé et le moteur en a besoin. Transporteur pressenti, grille de tarifs,
poids et dimensions maximum, contraintes sur les colis contenant de l'alcool,
livraison sur point relais ou à domicile.

## 1.2 Nécessaires pour que le moteur soit juste

**Q7 — Emballages.** Références, prix d'achat, conditionnement, dimensions, poids
(RETIF, RAJA ou autre). Sans cela le coût de revient reste une hypothèse.

**Q8 — Préparation.** Temps réel par coffret simple / complexe / personnalisé, et le
taux horaire à retenir.

**Q9 — Le filtre « bio » n'est pas alimentable.** Seuls **20 produits** (tous Maison
Hérout) portent « bio » dans leur libellé. Pour les 682 autres, la certification n'est
pas documentée. Soit vous me fournissez la liste des produits certifiés, soit je retire
ce filtre de la V1 — afficher « bio » sans certification vous expose.

**Q10 — Le filtre « 100 % français » vs « 100 % normand ».** Aujourd'hui vos 32
producteurs sont **tous normands** : les deux filtres donneraient le même résultat.
En revanche, **105 produits sont transformés en Normandie à partir d'une matière
première qui ne l'est pas** (café, thé, cacao, fruits exotiques, épices). Je propose
donc : « 100 % normand » = 597 produits (matière première comprise), et « français » =
tout le catalogue. Validez-vous cette définition ?

**Q11 — Personnalisation.** Logo, ruban, papier, carte : qui les produit, à quel coût,
sous quel délai, avec quel minimum ? Aucun document ne le dit. C'est le poste qui
décide si vous pouvez promettre une personnalisation rapide ou non.

**Q12 — Disponibilité hebdomadaire.** Comment saurez-vous qu'un producteur est en
rupture ? Appel, e-mail, portail ? Qui saisit l'indisponibilité, et à quelle
fréquence ? Le moteur en dépend directement.

## 1.3 Cadre et exploitation

**Q13** — Hébergement : WordPress ne tourne pas sur Vercel (voir §7). Hébergeur PHP
retenu ?
**Q14** — Les 3 000 contacts : origine, base légale, consentement recueilli ? Un import
en liste de diffusion sans base légale est un risque RGPD immédiat, différent en B2B
et en B2C.
**Q15** — Facturation : logiciel comptable existant à alimenter ? Numérotation imposée ?
**Q16** — Qui maintiendra le site après la livraison ?
**Q17** — Vente d'alcool en ligne : contrôle de l'âge à mettre en place, et
interdiction de livraison dans certains pays. Confirmez le périmètre France seule.

---

# 2. Ce qui ne va pas se marier avec WooCommerce

Je préfère vous les dire avant, pas après.

**2.1 Le coffret composé est un corps étranger dans Woo.**
Woo modélise un catalogue de produits à prix fixe. Vous vendez une **composition
calculée**, unique à chaque client. Le produit « coffret » n'existe pas au catalogue :
il naît d'un algorithme. Toute la difficulté est de faire entrer ça dans un panier, une
commande et une facture Woo sans le dénaturer. C'est faisable — via des lignes de
commande et des tables custom — mais c'est **le poste de complexité n° 1** et la
première source de bugs à venir (recalcul de panier, coupons, remboursements partiels).

**2.2 Multi-adresses : Woo n'est pas fait pour ça.** Voir Q4. Toutes les extensions
qui promettent le contraire ajoutent une couche fragile qui casse à chaque mise à jour
majeure de Woo.

**2.3 Le stock Woo ne correspond pas à votre modèle.** Vous n'avez pas de stock : vous
achetez après la commande. Il faut **désactiver la gestion de stock Woo** et modéliser
une *disponibilité producteur* à part. Sinon Woo bloquera des ventes ou en autorisera
qui ne sont pas honorables.

**2.4 Devis et acompte ne sont pas natifs.** Woo vend, il ne devise pas. Le cycle
devis → acceptation → acompte → solde est à construire. C'est le poste n° 2.

**2.5 HT / TTC selon le type de client.** Faisable, mais c'est un classique des
erreurs d'arrondi. Règle non négociable : **stocker les prix HT**, calculer la TVA par
ligne, arrondir **une seule fois** au total. Jamais l'inverse.

**2.6 Ce qui coûtera cher à maintenir**, par ordre décroissant :
1. Toute logique métier posée dans le thème ou dans des extensions empilées.
2. Un moteur de composition qui appellerait directement les API Woo — impossible à
   tester, impossible à faire évoluer. Il doit être **du PHP pur**, sans dépendance à
   WordPress, avec Woo en périphérie.
3. Un constructeur de pages (Elementor, Divi) sur le tunnel de composition : à
   proscrire, le tunnel est une application, pas une page.
4. Les extensions premium à licence annuelle multipliées : chacune est une dette.

**2.7 Le point faible commercial.** Votre moteur cherche « le remplissage maximal du
budget sans jamais le dépasser ». Poussé à la lettre, il produit des coffrets qui
tombent à quelques centimes du budget en empilant des produits sans logique de cadeau.
J'ai déjà mesuré ce risque sur votre catalogue réel dans le prototype : le remplissage
doit rester **subordonné à la cohérence** (pas deux fois la même sous-catégorie, une
pièce maîtresse identifiable, des producteurs variés). Sinon vous vendez un panier,
pas un cadeau.

---

# 3. Architecture

## 3.1 Principe

Trois couches, strictement séparées :

```
  Domaine (PHP pur, zéro WordPress)      ← testable, portable, c'est votre actif
      Composer\Engine, Pricing, Vat, Substitution, Availability
                    ↓
  Adaptateurs WooCommerce / WordPress    ← traduit le domaine en produits, commandes, taxes
                    ↓
  Présentation (thème, blocs, REST)      ← remplaçable sans rien casser
```

Le moteur de composition ne connaît ni `WC_Product`, ni `$wpdb`. Il reçoit des objets
`Product` simples et rend une `Composition`. C'est ce qui rend les tests unitaires
possibles et la maintenance supportable.

## 3.2 Arborescence du plugin

```
comptoir-chatonniers/
├── comptoir-chatonniers.php          Bootstrap, garde de version PHP/WP/Woo
├── composer.json                      PSR-4 : ComptoirChatonniers\
├── uninstall.php
├── languages/comptoir-chatonniers-fr_FR.po
│
├── src/
│   ├── Plugin.php                     Conteneur, hooks, activation
│   ├── Domain/                        ← PHP pur, aucune dépendance WordPress
│   │   ├── Model/                     Product, Composition, CompositionLine,
│   │   │                              Budget, Universe, Quote, VatLine,
│   │   │                              Substitution, ProducerAvailability
│   │   ├── Engine/
│   │   │   ├── CompositionEngine.php  Algorithme (§4)
│   │   │   ├── UniverseProfile.php    Le Normand, Le Gourmand, Le Prestige,
│   │   │   │                          Le Responsable, Le Sans alcool
│   │   │   ├── BudgetFitter.php       Remplissage et ajustement
│   │   │   ├── CoherenceRules.php     Contraintes de cohérence
│   │   │   └── PackagingSelector.php  Emballage adapté au budget
│   │   ├── Pricing/
│   │   │   ├── PriceCalculator.php    HT, coefficients, arrondis
│   │   │   ├── VatCalculator.php      TVA par ligne
│   │   │   └── VolumeDiscount.php     Paliers B2B (table, jamais en dur)
│   │   ├── Substitution/SubstitutionResolver.php
│   │   └── Repository/                Interfaces uniquement
│   │
│   ├── Infrastructure/                ← implémentations WordPress
│   │   ├── Repository/                Wpdb*Repository, WooProductRepository
│   │   ├── Database/Migrations/
│   │   └── Woo/
│   │       ├── OrderBuilder.php       Composition → lignes de commande
│   │       ├── TaxMapper.php          Classes de TVA Woo
│   │       ├── StockBridge.php        Désactive le stock Woo, lit la dispo producteur
│   │       └── MultiShipment.php      Commande mère → expéditions
│   │
│   ├── Application/                   Cas d'usage
│   │   ├── GenerateProposals.php
│   │   ├── CustomizeComposition.php
│   │   ├── IssueQuote.php             + PDF + e-mail
│   │   ├── AcceptQuote.php            → commande + acompte
│   │   └── BuildWeeklyPurchaseList.php
│   │
│   ├── Rest/                          Routes /wp-json/comptoir/v1/*
│   ├── Admin/                         Écrans, colonnes, réglages
│   ├── Frontend/                      Blocs Gutenberg, shortcodes, assets
│   ├── Emails/                        Classes WC_Email
│   └── Compliance/                    RGPD : export, effacement, registre,
│                                      consentement, mentions alcool
├── assets/src/                        Tunnel de composition (JS, sans framework lourd)
└── tests/
    ├── Unit/Domain/                   Moteur et TVA — sans WordPress, rapides
    └── Integration/                   Woo, commandes, taxes
```

Règle d'or : `src/Domain/` ne contient **aucun** appel à une fonction WordPress. Un
`grep -r "wp_\|WC_\|\$wpdb" src/Domain/` doit sortir vide, et c'est vérifié en CI.

## 3.3 Modèle de données

### Ce qui reste natif WooCommerce
| Objet | Support |
|---|---|
| Produits du catalogue | `product` (CPT), un par référence producteur |
| Prix d'achat, marge, coefficients | meta `_cc_purchase_price`, `_cc_margin_rate` |
| TVA | classes de TVA Woo : `alimentaire-5-5`, `alcool-20`, `accessoire-20` |
| Commandes, paiements, e-mails | Woo + **HPOS activé** |
| Clients | `WC_Customer` + rôle `wholesale_customer` |
| Producteur, origine, univers | taxonomies `cc_producer`, `cc_origin`, `cc_universe` |
| Régime alcool, bio, local | attributs produit |

### Tables custom — uniquement ce que Woo ne sait pas modéliser
```
{prefix}cc_compositions          id, uuid, universe, customer_type, budget_ht,
                                 quantity, preferences(json), packaging_id,
                                 total_products_ht, total_ht, total_vat, total_ttc,
                                 cost_price_ht, margin_ht, fill_rate, status,
                                 created_at
{prefix}cc_composition_lines     id, composition_id, product_id, qty, unit_price_ht,
                                 vat_rate, line_type(product|packaging|option|
                                 personalization), role(centerpiece|signature|base|extra),
                                 is_substituted, original_product_id
{prefix}cc_quotes                id, number, composition_id, customer_id, status,
                                 valid_until, pdf_path, accepted_at, accepted_ip,
                                 deposit_rate, deposit_amount, order_id
{prefix}cc_substitutions         id, product_id, primary_replacement_id,
                                 fallback_replacement_id, active
                                 -- contrainte : prix ≥ prix du produit remplacé
{prefix}cc_availability          id, product_id, producer_id, status, available_qty,
                                 lead_time_days, checked_at, checked_by
{prefix}cc_packagings            id, sku, supplier, type, tier, l_mm, w_mm, h_mm,
                                 weight_g, purchase_price_ht, sale_price_ht,
                                 max_products, active
{prefix}cc_volume_discounts      id, customer_type, qty_min, qty_max, rate, basis,
                                 active                      -- VIDE tant que Q3 non tranchée
{prefix}cc_order_destinations    id, order_id, recipient, company, address, postcode,
                                 city, country, qty, message, tracking_number, carrier,
                                 status
{prefix}cc_purchase_list         id, week_iso, producer_id, product_id, qty_needed,
                                 qty_ordered, unit_price_ht, status
{prefix}cc_engine_parameters     key, value, unit, description, updated_at, updated_by
{prefix}cc_audit_log             id, user_id, action, object_type, object_id,
                                 before(json), after(json), created_at
```

Toutes les valeurs économiques — coefficients, coûts d'emballage, préparation,
transport, paliers de remise — vivent dans `cc_engine_parameters` ou dans leur table.
**Aucune constante dans le code.**

### Où passe la substitution
`cc_composition_lines.is_substituted` + `original_product_id`. Le front lit un libellé
générique quand le drapeau est levé ; l'admin, la facture et la liste de courses lisent
le produit réel (voir Q2).

## 3.4 Conformité — traitée dès l'architecture

| Obligation | Où |
|---|---|
| CGV B2B et B2C distinctes | deux pages, la bonne étant liée selon `customer_type` ; version acceptée horodatée sur le devis |
| Rétractation B2C 14 jours | formulaire type, exclusions (produits périssables, personnalisés) ; **à cadrer : vos coffrets personnalisés en sont exclus** |
| RGPD | `Compliance/` : registre, consentement horodaté, export et effacement branchés sur les outils natifs WordPress |
| Facturation | numérotation continue, mentions obligatoires, TVA ventilée par taux |
| Alcool | mention d'interdiction de vente aux mineurs, contrôle d'âge à la commande, message sanitaire, restrictions de livraison |
| Allergènes | champ obligatoire par produit alimentaire — **absent de la base aujourd'hui, à collecter auprès des producteurs** |

---

# 4. Algorithme de composition — pseudo-code

Il vise le remplissage maximal du budget **sous contrainte de cohérence**, et ne
dépasse jamais le budget. Testé dans le prototype sur votre catalogue réel : à partir
de 35 € HT, les trois gammes sont complètes et l'offre intermédiaire tombe à moins
d'1 € du budget annoncé.

```
ENTRÉE  budget_ht, quantité, type_client, préférences{alcool, local, bio, premium},
        univers, catalogue, disponibilités, paramètres
SORTIE  3 à 5 compositions chiffrées, jamais vides, jamais au-dessus du budget

FONCTION generer_propositions(demande) :

  # ── 1. Filtrage dur ────────────────────────────────────────────────
  pool ← catalogue
      | actif ET disponibilité ∈ {en_stock, disponible_producteur}
      | délai producteur ≤ délai client
      | SI sans_alcool  : alcool = NON            (exclut aussi « alcool en ingrédient »)
      | SI 100%_normand : matière_première_française = OUI
      | SI bio          : certification_bio = OUI
      | catégorie vendable au détail
  SI pool vide → RENVOYER échec explicite (jamais un coffret vide)

  # ── 2. Univers demandés ────────────────────────────────────────────
  univers ← [Le Normand, Le Gourmand, Le Prestige, Le Responsable, Le Sans alcool]
            filtrés par la compatibilité avec les préférences
  déjà_proposés ← ∅

  POUR CHAQUE u DANS univers :

      # ── 3. Emballage : adapté au budget, pas au libellé ────────────
      emballage ← plus petit emballage du niveau de u
                  TEL QUE prix ≤ budget × PART_MAX_EMBALLAGE (22 %)
                  SINON descendre d'un niveau
      enveloppe ← budget − prix(emballage) − coût_préparation(u)

      # ── 4. Remplissage : la pièce maîtresse d'abord ────────────────
      # Remplie en dernier, elle n'aurait plus de budget : le coffret
      # se retrouverait sans produit structurant.
      emplacements ← squelette(u)                  # familles à couvrir
      trier(emplacements, pièce_maîtresse d'abord)
      choisis ← ∅

      POUR CHAQUE e, rang r DANS emplacements :
          restants   ← nb_emplacements − r
          disponible ← enveloppe − total(choisis)
          part       ← disponible / restants
          # Deux garde-fous : réserver la part des emplacements suivants,
          # et empêcher un emplacement de la manger.
          plafond ← MIN( disponible − (restants−1) × PRIX_PLANCHER,
                         e.pièce_maîtresse ? disponible × 0.55 : part × FACTEUR )
          SI plafond ≤ 0 → CONTINUER

          candidats ← pool
              | catégorie ∈ e.familles
              | sous_catégorie ∉ sous_catégories_déjà_prises      # cohérence
              | prix_vente_ht ≤ plafond
              | noblesse ≥ seuil(e)      # objectif, pas blocage : repli si vide

          note(p) ← pertinence(p, demande, déjà_proposés)
                    − |prix(p) − cible(e)| × POIDS_BUDGET
                    − (producteur déjà présent ? PÉNALITÉ : 0)
          # pertinence = qualité perçue, ancrage local, préférences, saison,
          #              logistique, PUIS marge en dernier critère de départage.
          choisis ← choisis ∪ argmax(candidats, note)      # départage stable par id

      # ── 5. Si un emplacement est resté vide, rejouer plus strict ───
      SI |choisis| < nb_produits_cible ET facteurs restants :
          RECOMMENCER l'étape 4 avec FACTEUR plus strict (1.7 → 1.3 → 1.05)

      # ── 6. Remplissage maximal du budget ───────────────────────────
      # Monter en gamme un produit à la fois, dans la même sous-catégorie,
      # sans jamais dépasser l'enveloppe.
      TANT QUE total(choisis) < enveloppe × SEUIL_REMPLISSAGE (94 %)
              ET itérations < MAX :
          meilleur ← ∅
          POUR CHAQUE c DANS choisis :
              POUR CHAQUE r DANS pool
                  | sous_catégorie(r) = sous_catégorie(c)
                  | prix(r) > prix(c)
                  | total − prix(c) + prix(r) ≤ enveloppe :
                  gain ← (prix(r) − prix(c)) × 2 + (pertinence(r) − pertinence(c))
                  meilleur ← max(meilleur, gain)
          SI aucun → SORTIR
          appliquer(meilleur)

      # ── 7. Le budget ne permet pas la cible : le dire ──────────────
      SI |choisis| < nb_produits_cible :
          composition.limite ← { manquants, budget_conseillé }
          # On n'invente pas un coffret creux et on ne dépasse pas en douce.

      # ── 8. Chiffrage : chaque poste reste distinct ─────────────────
      POUR CHAQUE ligne : tva_ligne ← taux(produit)        # 5,5 / 20 par ligne
      coût_revient ← Σ prix_achat + emballage + protections + préparation
      total_ht     ← Σ prix_vente + emballage
      remise       ← palier_volume(quantité, type_client)  # table, sinon 0
      transport    ← grille(poids, colis)                  # refacturé au coût,
                                                           # hors marge produit
      marge        ← total_ht − remise − coût_revient      # transport exclu

      déjà_proposés ← déjà_proposés ∪ choisis   # pour différencier les univers
      propositions  ← propositions ∪ composition

  RENVOYER trier(propositions, par pertinence)
```

**Substitution, à la préparation :**
```
FONCTION resoudre(ligne) :
    SI disponible(ligne.produit) → ligne
    SINON SI disponible(substitut_principal)
         ET prix(substitut_principal) ≥ prix(ligne.produit)
         ET régime_alcool et allergènes compatibles
         → substituer, marquer is_substituted, journaliser
    SINON SI disponible(substitut_secours) ET mêmes conditions
         → substituer
    SINON → alerte admin, arbitrage humain    # jamais de silence
```

**Cas limites couverts par les tests unitaires** (exigés avant tout développement) :
budget très bas (aucune composition possible → échec explicite, jamais vide) ;
catalogue partiellement indisponible ; produit unique dépassant le budget ; budget
exactement égal à un produit + emballage ; TVA mixte 5,5/20 avec arrondi au total ;
paliers de remise aux bornes ; substitution en cascade quand les deux substituts sont
indisponibles.

---

# 5. Extensions

## Recommandées
| Besoin | Extension | Pourquoi |
|---|---|---|
| Paiement | **WooCommerce Stripe** ou **Mollie officiel** | SAQ-A, aucune donnée bancaire chez nous |
| Performance commandes | **HPOS** (natif Woo) | indispensable à 3 000 contacts et plus |
| PDF facture | **WooCommerce PDF Invoices & Packing Slips** | mature, gratuit, extensible |
| E-mails transactionnels | **SMTP dédié** (Brevo, Postmark) | délivrabilité |
| Sauvegardes | **UpdraftPlus** | — |
| Sécurité | **Wordfence** ou **Solid Security** | — |
| SEO | **Rank Math** ou **Yoast** | — |
| RGPD | outils natifs WordPress + notre `Compliance/` | pas d'usine à gaz |
| Traduction | **Loco Translate** en développement | — |

## À éviter
| Extension | Pourquoi |
|---|---|
| **Elementor / Divi / WPBakery** sur le tunnel | le tunnel est une application ; un constructeur le rendra lent et infigeable |
| **Product Bundles / Composite Products** | ils modélisent un bundle **prédéfini**, pas une composition calculée par budget. Vous paieriez une licence pour ensuite la contourner |
| Extensions **multi-adresses** génériques | fragiles, cassent aux montées de version — voir Q4 |
| Extensions **devis** génériques (YITH Request a Quote…) | pensées pour « demandez un prix, on vous rappelle », l'exact inverse de votre objectif |
| Empilement de **plugins B2B** | un seul rôle `wholesale_customer` + notre affichage HT/TTC suffit |
| **Tout cache agressif** sur le tunnel | les prix sont calculés par requête : à exclure du cache page |

---

# 6. Ce que le catalogue permet déjà

Base reconstituée et vérifiée (`data/base-produits-noel/`) :

| | |
|---|---|
| Produits vendables | **629** (702 références, moins le vrac et les produits professionnels) |
| Producteurs | **32**, tous normands, adresses connues |
| Prix d'achat | **100 %** documentés |
| Prix de vente | **701 proposés** par coefficients de marché — à valider |
| Marge médiane | **54,9 %** sur le produit seul |
| Sans alcool | **529** · avec alcool **140** · alcool en ingrédient **33** |
| 100 % normand matière première comprise | **597** |
| TVA | 360 à 5,5 % · 300 à 20 % · **42 non documentées** |

**Deux anomalies à corriger avant la mise en vente :**
- **23 alcools du Domaine de Billy sans taux de TVA** dans le tarif source. Votre règle
  « 20 % sur les alcools » les couvre, mais je préfère que ce soit vous qui le
  confirmiez plutôt que de le déduire.
- **L'hydromel 75 cl est tarifé à 5,5 %** dans le tarif fournisseur alors que c'est une
  boisson alcoolisée. Erreur du document source, à faire corriger.

---

# 7. Démonstration Vercel

**WordPress ne tourne pas sur Vercel** (pas de PHP ni de MySQL persistants). Deux
lectures possibles de votre demande :

**A — Une démo pour voir le moteur à l'œuvre : c'est déjà fait et déployable.**
Le prototype Next.js dans `coffrets-noel/` est fonctionnel sur votre catalogue réel :
questionnaire, trois propositions chiffrées, échange de produit, extras, récapitulatif
détaillé, devis numéroté. Il se déploie sur Vercel en une commande :

```bash
cd coffrets-noel && npx vercel --prod
```

Il me faut simplement que vous connectiez le dépôt à votre compte Vercel, ou que vous
me fournissiez un jeton. C'est le moyen le plus rapide de valider **l'algorithme et le
parcours** avant d'écrire une ligne de PHP — et ce que je recommande.

**B — Une architecture headless définitive** : WooCommerce en back sur un hébergeur
PHP, front Next.js sur Vercel. Techniquement possible, mais cela **double la surface à
maintenir** (deux déploiements, une API à versionner, le tunnel Woo à réimplémenter) et
vous perdez l'écosystème d'extensions qui justifie WooCommerce. Je vous le déconseille
pour un lancement.

Ma recommandation : **A pour valider, WordPress classique pour la production.**

---

# 8. Suite proposée, après votre validation

| Étape | Contenu | Livrable |
|---|---|---|
| 1 | Squelette du plugin, migrations, domaine + **tests unitaires du moteur et de la TVA** | tests verts, zéro fonctionnalité visible |
| 2 | Import du catalogue et des producteurs, écrans admin | catalogue en base |
| 3 | Moteur branché, API REST, tunnel de composition | démo interne |
| 4 | Devis PDF, e-mail automatique, tableau de bord | devis de bout en bout |
| 5 | Acceptation, acompte, paiement | commande payée |
| 6 | Multi-destinataires, expéditions, suivi | livraison |
| 7 | Liste de courses hebdomadaire par producteur | exploitation |
| 8 | Conformité : CGV, RGPD, alcool, rétractation | mise en ligne |

Rien ne démarre tant que **Q1 à Q6** ne sont pas tranchées : ce sont elles qui décident
du modèle de données, et les reprendre après coup coûterait une réécriture.
