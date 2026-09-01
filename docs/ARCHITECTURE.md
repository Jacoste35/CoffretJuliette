# Comptoir des Chatonniers — Étape 1 : cadrage et architecture

**Statut : proposition soumise à validation. Aucune ligne de code n'a été écrite.**

Document de travail. Il répond aux quatre points de la méthode imposée :
questions de cadrage, critique du concept, architecture complète, extensions.

---

## 0. Deux points bloquants avant tout le reste

### 0.1 WordPress ne peut pas être hébergé sur Vercel

`coffret-juliette-j576laa79-jacoste-s-projects.vercel.app` ne peut pas servir un
site WordPress + WooCommerce. Vercel exécute des fonctions serverless
JavaScript/Python sur un système de fichiers éphémère, sans runtime PHP officiel,
sans MySQL et sans cron persistant. WooCommerce a besoin des quatre.

Il n'y a pas de contournement : c'est une incompatibilité de nature, pas de
configuration.

| Option | Description | Conséquence sur le brief |
|---|---|---|
| **A. Hébergement PHP managé** *(recommandé)* | o2switch, Infomaniak, Kinsta, WP Engine, Hostinger. Domaine propre. | Le brief tient tel quel. Coût 5 à 30 €/mois selon l'offre. |
| B. Headless | WooCommerce sur hébergement PHP + front Next.js sur Vercel (Store API). | +40 à 60 % de charge de dev, double maintenance, SEO et tunnel de paiement à recâbler entièrement. Déconseillé pour un lancement. |
| C. Abandonner WordPress | Next.js + Stripe + PostgreSQL sur Vercel. | Cohérent avec Vercel, mais annule tout l'intérêt de WooCommerce : commandes, taxes, emails, factures, comptes clients, écosystème — tout est à réécrire. |

**Recommandation : option A.** Vercel peut rester utile pour une landing page
vitrine ou une redirection, rien de plus. Si Vercel est une contrainte non
négociable, c'est l'option C qu'il faut assumer, et il faut alors refaire ce
cadrage sur une autre base technique.

### 0.2 La base produits ne permet pas encore de faire tourner le moteur

Analyse des 703 lignes de `data/base-produits-noel/export/PRODUITS.csv` :

| Donnée | État | Impact |
|---|---|---|
| `prix_vente_ht` | **0 / 703 renseignés** | Le moteur compose sur un prix de vente. Sans lui, il ne peut rien produire. **Bloquant absolu.** |
| `url_photo` | **0 / 703** | Un configurateur sans visuel ne convertit pas. Bloquant commercialement. |
| Dimensions (L/l/h) | **0 / 703** | Impossible de savoir combien de produits rentrent dans un coffret. Le moteur proposera des compositions non préparables. |
| `poids_net_g` | 481 / 703 | Frais de port approximatifs sur 1/3 du catalogue. |
| `description` | 183 / 703 | 74 % des fiches produits sont vides. |
| `personnalisable` | **703 / 703 « À CONFIRMER »** | Aucune personnalisation vendable aujourd'hui. |
| `tva_taux` | 42 « À CONFIRMER » | 42 produits inutilisables tant que le taux n'est pas tranché. |
| Tarifs emballages / transport | Tables vides | Coût de revient et frais de port non calculables. |

Le chemin critique de ce projet n'est pas le code : c'est la complétion de cette
base. Le développement peut démarrer en parallèle, mais **aucune mise en ligne
n'est possible sans le lot 0 décrit au §7**.

---

## 1. Questions de cadrage

### 1.1 Bloquantes — sans réponse, l'architecture ne peut pas être figée

1. **Hébergement.** Option A, B ou C du §0.1 ?
2. **Politique de prix de vente.** Coefficient multiplicateur par catégorie ? Par
   niveau de gamme ? Prix saisi produit par produit ? Les paramètres
   `TAUX_MARGE_CIBLE_*` sont « À DÉFINIR ».
3. **Le budget saisi par le client**, c'est quoi exactement ? HT ou TTC ? Par
   coffret ou pour l'ensemble ? Contenant et emballage inclus ? Frais de port
   inclus ? Personnalisation incluse ?
4. **Marge plancher.** Le moteur doit-il refuser une composition qui remplit
   parfaitement le budget mais tombe sous X % de marge ? Quel X par gamme ?
5. **Le contenant.** Qui le fournit, à quel coût, quelle contenance ? Un catalogue
   de 3 ou 4 tailles ? C'est ce qui borne le nombre de produits par coffret.
6. **Photos.** Qui les produit, sous quel délai ? Une photo générique par
   catégorie est-elle acceptable en secours au lancement ?
7. **Alcool.** 33 produits sont classés `INGREDIENT_ALCOOLISE` (terrine au
   calvados, caramel calvados, confiture au cidre). « Sans alcool » les
   exclut-il ? *Recommandation : oui par défaut, avec deux niveaux —
   « sans boisson alcoolisée » et « sans alcool strict ».*
8. **Substitution et information du client.** Acceptez-vous que la composition
   réellement livrée soit nommée sur le bon de livraison et la facture, même si
   le devis reste générique ? Voir §2.2 — c'est une contrainte réglementaire,
   pas un choix d'interface.

### 1.2 Importantes — elles changent le chiffrage

9.  **Volumétrie.** Combien de devis par jour à la haute saison ? Taille maximale
    d'une commande ? Délai de préparation acceptable ?
10. **Multi-destinataires.** Combien de destinataires au maximum ? Le client
    saisit-il un par un ou importe-t-il un fichier ? Un colis par destinataire ou
    des envois groupés par site ? *Voir §2.2 point 7 : c'est le poste le plus cher
    du projet.*
11. **Acompte.** Quel pourcentage ? À quelle échéance le solde ? *(Rappel : en
    B2B, une facture d'acompte est obligatoire.)*
12. **Paliers de remise B2B.** Les seuils exacts. La base ne contient **aucune**
    remise côté vente — les 5 lignes de `REMISES.csv` sont des remises
    *fournisseur*.
13. **Comptes professionnels.** Création libre ou validation manuelle avec SIRET
    et TVA intracommunautaire ? Les prix HT sont-ils réservés aux comptes validés ?
14. **Les 3 000 contacts.** Quel format ? Quel consentement documenté ? En B2C, la
    prospection par email exige un opt-in préalable — importer une base sans
    preuve de consentement expose à une sanction CNIL.
15. **Transport et froid.** Quels transporteurs ? 79 produits `TRAITEUR_MER` et 59
    de charcuterie : y a-t-il du frais, et est-il expédiable ?
16. **Personnalisation.** Marquage sur quoi exactement — ruban, carte, étiquette,
    boîte ? Coût, quantité minimale, délai ?
17. **Comptabilité.** Un outil existe-t-il déjà (Pennylane, Sellsy, Axonaut) ?
    Quelle numérotation de factures reprendre ?
18. **Échéance.** Date de mise en ligne visée. Une opération de Noël 2026 est-elle
    dans la cible ?

### 1.3 Peuvent attendre

19. Livraison hors France ? *(Recommandation : non en v1 — l'expédition d'alcool
    hors de France déclenche les obligations d'accises et le régime EMCS.)*
20. Site multilingue ?
21. Retrait sur place / click & collect ?

---

## 2. Critique du concept

### 2.1 Ce qui est juste

- **L'angle budget-first est le bon.** Un acheteur d'entreprise n'a pas envie d'un
  produit, il a un budget par tête et une date. Partir du budget plutôt que du
  catalogue est un vrai différenciant, et personne ne le fait bien sur ce marché.
- **La base produits est déjà remarquablement structurée.** 3 020 alternatives
  qualifiées, des scores, une traçabilité de la source ligne par ligne, et une
  discipline rare : rien n'a été inventé. Le travail de données le plus difficile
  est fait à 80 %.
- **Pas de stock permanent + achat hebdomadaire = modèle sain.** La liste de
  courses agrégée par producteur est le vrai gain opérationnel du projet, plus
  encore que le configurateur.

### 2.2 Les points faibles

**1. Le devis automatique sans validation vous engage juridiquement.**
Un devis émis et envoyé sans relecture est une offre ferme. Une erreur de prix,
et vous devez l'honorer ou entrer en litige. Parades à intégrer dès la conception :
durée de validité explicite (15 jours), clause « sous réserve de disponibilité
chez le producteur », **plafond automatique** au-delà duquel le devis passe en
validation manuelle (par exemple > 50 coffrets ou > 5 000 € HT), et blocage dur si
la marge calculée tombe sous le plancher.

**2. La substitution masquée est un risque de conformité, pas un détail d'interface.**
Trois contraintes se cumulent :
- **Information du consommateur.** En B2C, une clause de substitution n'est
  licite que si elle est prévue au contrat, que le produit de remplacement est de
  qualité et de prix équivalents ou supérieurs, et que le client en est informé.
- **Allergènes.** Le règlement INCO (UE) 1169/2011 impose que les informations
  sur les allergènes des denrées préemballées soient disponibles **avant la
  conclusion de la vente à distance**. On ne peut pas livrer une denrée
  alimentaire dont le client ignore la nature.
- **Rétractation.** Elle reste ouverte au consommateur pour ce qui n'en est pas
  exclu (voir §6).

Ce que je propose, et qui respecte votre intention commerciale :
la mention générique « produit équivalent de valeur égale ou supérieure » reste
telle quelle **dans le configurateur et le PDF de devis**. La composition
réellement livrée est nommée **sur le bon de livraison, sur la facture, et sur une
page « composition de votre coffret » accessible par lien ou QR code**. Côté B2B,
une case « j'autorise les substitutions équivalentes », cochée par défaut et
décochable. *À faire confirmer par votre conseil juridique.*

**3. Le moteur raisonne en prix, la réalité est en volume.**
Huit produits à 5 € dans un budget de 40 € ne rentrent pas forcément dans la
boîte. Sans dimensions, le moteur produira des compositions impossibles à
préparer. Palliatif de démarrage : une contrainte combinée nombre de pièces +
poids + un « encombrement » en points, saisi grossièrement par catégorie, à
affiner ensuite.

**4. La disponibilité est purement déclarative.**
Les 703 produits sont tous « SUR_COMMANDE » d'après un tarif. Le devis promet ce
que le producteur n'a peut-être pas. Il faut un **catalogue de saison restreint**
(120 à 200 références, pas 703) dont la disponibilité est confirmée chaque semaine.

**5. Frais et sec ne se mélangent pas.**
79 produits de traiteur de la mer et 59 de charcuterie. Mélanger du frais et de
l'ambiant dans un coffret expédié est un problème sanitaire et opérationnel. Il
faut un indicateur « expédiable » et « température » par produit, et interdire au
moteur de composer un coffret mixte.

**6. Le multi-destinataires est le poste le plus cher du projet.**
WooCommerce a **une** adresse de livraison par commande. Ce n'est pas un réglage,
c'est le modèle de données. La seule voie propre est une commande mère et des
commandes filles, avec toutes les conséquences sur les paiements, les factures,
les emails, les retours et les remboursements partiels. Comptez 20 à 30 % du
budget de développement pour cette seule fonction.
**Question : peut-on lancer en v1 avec une livraison groupée sur un site unique —
le cas le plus fréquent en CSE — et repousser le multi-adresses en v2 ?**

**7. La TVA par ligne sur un prix global demande une justification.**
Une offre composite vendue pour un prix unique est en principe une opération
unique. La ventilation par taux est admise, mais elle doit reposer sur une
répartition économiquement justifiée. Conséquences concrètes :
- il faut conserver la **traçabilité ligne à ligne** dans la commande, pas un
  pourcentage global appliqué après coup ;
- l'**emballage, le contenant et la prestation de composition suivent le taux de
  20 %**, jamais 5,5 % ;
- un coffret entier facturé à 5,5 % parce qu'il est « alimentaire » est un
  redressement. *À faire valider par votre expert-comptable.*

**8. Le double affichage HT/TTC casse le cache.**
Prix variables selon le rôle utilisateur + cache pleine page = le bug classique
numéro un de ce type de site. Un particulier verra des prix HT, ou l'inverse. Il
faut faire varier le cache par rôle, ou désactiver le cache sur les pages de prix
pour les utilisateurs connectés — et l'écrire dans l'architecture, pas le
découvrir en production.

**9. Le catalogue est plein de « À CONFIRMER ».**
Le moteur doit **refuser** d'utiliser un produit dont le prix, le taux de TVA ou
la disponibilité ne sont pas fiables. Un score de complétude bloquant, calculé à
l'import, évite qu'une donnée incertaine finisse dans un devis contractuel.

**10. Le coût de maintenance réel n'est pas le plugin.**
C'est : les mises à jour de WooCommerce (qui casse régulièrement templates et
hooks), la mise à jour hebdomadaire du catalogue, les visuels, la relation
producteur. Comptez une demi-journée par semaine minimum en régime de croisière,
hors évolutions.

**11. Alcool.** Vérification d'âge obligatoire, interdiction de vente aux mineurs,
mention sanitaire obligatoire, et encadrement publicitaire (loi Évin) — ce dernier
point vise directement l'emailing sur votre base de 3 000 contacts.

### 2.3 Ce qui se marie mal avec WooCommerce

| Besoin | Natif Woo | Verdict |
|---|---|---|
| Produit à prix dynamique | Non | Contournable proprement : un produit « coffret » dont le prix est calculé à l'ajout au panier |
| Devis avec cycle de vie | Non | Table custom — sain |
| TVA par ligne dans un coffret | Oui, si lignes réelles | Il faut **éclater le coffret en lignes de commande** |
| 1 commande → N adresses | **Non** | Commande mère / filles — coûteux |
| Acompte puis solde | Non | Deux commandes séquencées, ou extension |
| HT pour les pros, TTC pour les particuliers | Partiel | Filtres + gestion du cache — fragile |
| Vente sans stock permanent | Oui | Gestion de stock désactivée, disponibilité gérée à part |
| Liste de courses fournisseurs | Non | Table custom + rapport figé |
| Prix dégressifs par volume | Non | Table de paliers custom |

**Verdict global : on garde WooCommerce.** Il apporte le tunnel de commande, les
paiements certifiés, les emails transactionnels, le moteur de taxes, HPOS, les
comptes clients et un écosystème mature. Mais le « coffret » ne doit pas être un
produit WooCommerce ordinaire : c'est une **composition** qui se projette en
lignes de commande au moment de la validation.

---

## 3. Architecture du plugin

### 3.1 Principes non négociables

- **Un seul plugin autonome**, `comptoir-des-chatonniers`. Rien dans le thème,
  rien dans `functions.php`. Le thème reste un thème enfant standard sans logique.
- **Une couche `Domain/` sans une seule ligne de WordPress.** Pas de `get_post()`,
  pas de `$wpdb`, pas de `apply_filters()`. Que du PHP pur, des objets valeur et
  des interfaces. C'est ce qui rend les tests unitaires obligatoires réellement
  faisables : le moteur de composition et le calcul de TVA se testent en PHPUnit
  sans démarrer WordPress, en quelques millisecondes.
- **Une couche `Infrastructure/`** qui implémente les interfaces du domaine avec
  WordPress et WooCommerce. C'est la seule qui connaît `$wpdb`, `WC_Order`, `wp_mail`.
- Namespace `CDC\`, textdomain `comptoir-des-chatonniers`, préfixe de tables
  `wp_cdc_`, préfixe d'options et de hooks `cdc_`.
- Tout est traduisible, tout est échappé à la sortie, tout est assaini à l'entrée,
  tout formulaire porte un nonce, toute action back-office vérifie une capacité.

### 3.2 Arborescence

```
comptoir-des-chatonniers/
├── comptoir-des-chatonniers.php      Bootstrap, en-tête, garde de version PHP/WP/WC
├── uninstall.php
├── composer.json                      autoload PSR-4, dompdf, phpunit, phpcs, phpstan
├── phpcs.xml.dist                     WordPress-Coding-Standards
├── phpstan.neon.dist
├── src/
│   ├── Plugin.php                     conteneur, câblage des hooks
│   ├── Activator.php / Deactivator.php / Migrator.php   schéma versionné
│   │
│   ├── Domain/                        ← ZÉRO WordPress. 100 % testable.
│   │   ├── Catalogue/
│   │   │   ├── Produit.php            objet immuable : prix, tva, alcool, poids,
│   │   │   │                          encombrement, scores, substituts, complétude
│   │   │   ├── Substituts.php         principal + secours
│   │   │   ├── Regime.php             sans alcool, bio, normand, français, premium
│   │   │   └── CatalogueInterface.php
│   │   ├── Composition/
│   │   │   ├── Gabarit.php            un univers = une liste de slots
│   │   │   ├── Slot.php               rôle, catégories admises, part de budget, requis
│   │   │   ├── Contraintes.php        budget, préférences, marge plancher, capacité
│   │   │   ├── Composition.php        le résultat : lignes + totaux + taux de remplissage
│   │   │   ├── Moteur.php             ← l'algorithme (§4)
│   │   │   ├── Selecteur.php          choix d'un produit pour un slot
│   │   │   ├── Reparateur.php         montée / descente en gamme
│   │   │   ├── Diversificateur.php    garantit que les propositions diffèrent
│   │   │   └── ResultatMoteur.php     propositions + diagnostic d'échec explicite
│   │   ├── Tarification/
│   │   │   ├── CalculTva.php          ← testé unitairement, par ligne
│   │   │   ├── Ligne.php              base HT, taux, montant TVA, TTC
│   │   │   ├── PalierRemise.php       dégressif B2B
│   │   │   └── Devise.php             entiers en centimes, jamais de float
│   │   ├── Devis/
│   │   │   ├── Devis.php / LigneDevis.php
│   │   │   ├── EtatDevis.php          machine à états (§5)
│   │   │   └── PolitiqueValidation.php  plafonds de passage en revue manuelle
│   │   └── Approvisionnement/
│   │       ├── ListeCourses.php       agrégation par fournisseur
│   │       └── ArrondiConditionnement.php  multiples, MOQ, panachage
│   │
│   ├── Infrastructure/
│   │   ├── Persistence/               dépôts $wpdb, une classe par table
│   │   ├── WooCommerce/
│   │   │   ├── ProduitAdapter.php     WC_Product → Domain\Produit
│   │   │   ├── ProjecteurCommande.php Composition → lignes de WC_Order
│   │   │   ├── ClassesTaxe.php        mappage catégorie → classe de taxe Woo
│   │   │   ├── AffichageHtTtc.php     B2B/B2C + variation du cache
│   │   │   └── Hpos.php               déclaration de compatibilité
│   │   ├── Pdf/                       Dompdf, gabarits devis / BL / composition
│   │   ├── Email/                     WC_Email étendus, gabarits surchargeables
│   │   └── Import/                    lecteur CSV de data/base-produits-noel
│   │
│   ├── Admin/
│   │   ├── TableauDeBord.php          devis du jour, alertes, taux d'acceptation
│   │   ├── EcranDevis.php / EcranComposition.php
│   │   ├── EcranDisponibilite.php     saisie hebdomadaire producteur
│   │   ├── EcranListeCourses.php      génération + export par fournisseur
│   │   ├── EcranSubstitutions.php     journal, qui a remplacé quoi et pourquoi
│   │   ├── EcranGabarits.php          édition des univers sans toucher au code
│   │   └── EcranParametres.php        les 15 paramètres moteur, éditables
│   │
│   ├── Rest/                          /wp-json/cdc/v1/*  (composer, devis, accepter)
│   ├── Front/                         configurateur, shortcodes + bloc Gutenberg
│   ├── Rgpd/                          exporteurs et effaceurs pour les tables custom
│   └── Support/                       logger, verrous, hachage déterministe
│
├── assets/                            JS du configurateur (vanilla ou Preact), CSS
├── templates/                         surchargeables par le thème
├── languages/comptoir-des-chatonniers-fr_FR.po
└── tests/
    ├── Unit/                          Domain uniquement — pas de WordPress
    │   ├── MoteurTest.php             ← obligatoire, cas limites du §4.6
    │   ├── CalculTvaTest.php          ← obligatoire
    │   ├── PalierRemiseTest.php
    │   └── ListeCoursesTest.php
    └── Integration/                    wp-env + suite de tests WooCommerce
```

### 3.3 Modèle de données

**Règle de partage :** tout ce que WooCommerce sait modéliser reste chez
WooCommerce. Les tables custom ne portent que ce qu'il ne sait pas faire.

#### Chez WooCommerce / WordPress

| Objet | Support | Remarques |
|---|---|---|
| Produit du catalogue | `product` natif | Stock désactivé, visible ou non en boutique |
| Commande | `wc_orders` (HPOS) | Une commande = un coffret ou un lot |
| Client, adresses | Client Woo natif | Rôle `cdc_pro` pour le B2B |
| **Taux de TVA** | **Classes de taxe Woo** | `alimentaire-5-5`, `standard-20`. Jamais une meta : c'est la classe qui fait que Woo calcule juste, seul, partout — panier, commande, avoir, export comptable. |
| Emails | `WC_Email` étendu | Devis, relance, acceptation, acompte |
| Coupons, frais de port | Natif | |

#### Types de contenu custom

| CPT | Rôle |
|---|---|
| `cdc_producteur` | 27 champs riches (adresse, conditions, panachage, minimum, délais). Un CPT plutôt qu'une taxonomie car il porte des données, pas seulement un libellé. |
| `cdc_gabarit` | Un univers = un gabarit de slots, éditable en back-office **sans toucher au code**. C'est ce qui vous permet de créer « Le Breton » ou « Le Zéro déchet » tout seul. |
| `cdc_contenant` | Boîtes et paniers : coût, capacité, dimensions, gammes compatibles |

#### Taxonomies

`cdc_categorie` (12 valeurs existantes), `cdc_sous_categorie` (36),
`cdc_origine` (normand confirmé / français / autre — **avec le niveau de preuve**,
la distinction du README de la base est trop précieuse pour être perdue),
`cdc_label` (bio, AOP, AOC, IGP), `cdc_gamme` (Essentiel, Signature, Premium,
Prestige), `cdc_regime_alcool` (sans / ingrédient alcoolisé / boisson alcoolisée).

#### Meta produit (préfixe `_cdc_`)

`prix_achat_ht`, `id_fournisseur`, `degre_alcool`, `poids_net_g`, `poids_brut_g`,
`encombrement_points`, `dimensions`, `substitut_principal`, `substitut_secours`,
`score_valeur_percue`, `score_noblesse`, `score_local`, `expediable`,
`temperature` (ambiant / frais), `multiple_commande`, `minimum_commande`,
`panachable`, `allergenes`, **`score_completude`** (0-100, calculé à l'import ;
en dessous du seuil, le produit est invisible pour le moteur),
`niveau_preuve_origine`, `source`, `ligne_source`.

#### Tables custom

| Table | Contenu | Pourquoi elle ne peut pas être une meta |
|---|---|---|
| `wp_cdc_composition` | Une composition proposée ou retenue : gabarit, budget cible, total, taux de remplissage, marge, empreinte déterministe | Volume et requêtes analytiques |
| `wp_cdc_composition_ligne` | produit, quantité, prix figé HT, taux TVA, slot, rôle | Le prix doit être **gelé** à la date du devis, jamais recalculé |
| `wp_cdc_devis` | numéro, client, état, dates d'envoi / de vue / de validité, jeton public, montants, version des CGV acceptées | Machine à états + recherche |
| `wp_cdc_devis_composition` | Lien devis ↔ compositions, avec quantités | Un devis porte plusieurs coffrets |
| `wp_cdc_substitution` | ligne, produit prévu, produit livré, motif, écart de valeur, opérateur, horodatage | **Journal d'audit**, jamais modifiable |
| `wp_cdc_disponibilite` | produit × semaine ISO : disponible, quantité indicative, source | Le cœur du modèle sans stock |
| `wp_cdc_palier_remise` | Grille dégressive B2B | |
| `wp_cdc_destinataire` | Destinataires d'une commande, rattachés à la commande mère | |
| `wp_cdc_liste_courses` / `_ligne` | Liste hebdomadaire **figée** à la génération | Un rapport recalculé n'est pas auditable |
| `wp_cdc_journal` | Journal applicatif : devis émis, échecs du moteur, imports | Diagnostic |

Toutes les tables portent `created_at`, `updated_at`, et un index sur les colonnes
de recherche. Les montants sont stockés en **entiers, en centimes** — jamais en
flottants.

#### Correspondance avec la base existante

| CSV | Cible |
|---|---|
| `PRODUITS.csv` | `product` + meta `_cdc_*` + taxonomies |
| `FOURNISSEURS.csv` | `cdc_producteur` |
| `PRODUITS_ALTERNATIVES.csv` | `_cdc_substitut_principal` / `_secours` (les 2 meilleurs par produit selon l'écart de prix et de noblesse) |
| `PRODUITS_SCORES.csv` | meta de scores |
| `PARAMETRES_MOTEUR.csv` | Options `cdc_moteur_*`, écran Paramètres |
| `REMISES.csv`, `CONDITIONS_FOURNISSEURS.csv` | `cdc_producteur` (conditions d'achat, pas de vente) |
| `COFFRETS.csv` / `COFFRETS_LIGNES.csv` | `cdc_gabarit` de départ |
| `DOUBLONS`, `CONFLITS`, `ANOMALIES` | Écran d'arbitrage à l'import — rien n'est fusionné automatiquement |

---

## 4. Le moteur de composition

### 4.1 Le concept central : le gabarit d'univers

Un univers n'est pas une liste de produits, c'est une **structure de coffret**.
« Le Normand » = un salé local + un sucré local + une boisson normande + une
douceur + un extra. Chaque emplacement est un **slot** portant : un rôle, les
catégories admises, une part de budget cible et maximale, et le fait d'être
obligatoire ou non.

C'est ce qui rend le moteur explicable, bornable et pilotable par vous plutôt que
par le code. Un knapsack pur maximiserait le remplissage en proposant cinq pots de
confiture : mathématiquement optimal, commercialement invendable.

| Univers | Slots types | Contrainte propre |
|---|---|---|
| Le Normand | salé local, sucré local, boisson normande, douceur, extra | origine = Normandie **confirmée** (68 produits aujourd'hui — voir §0.2) |
| Le Gourmand | salé, sucré, biscuiterie, boisson, douceur | équilibre sucré/salé |
| Le Prestige | pièce maîtresse, accompagnement, boisson d'exception, douceur | gamme ≥ Premium, part de budget de la pièce maîtresse ≥ 35 % |
| Le Responsable | 3 à 5 slots, tous bio ou local | label bio ou origine confirmée |
| Le Sans alcool | salé, sucré, boisson sans alcool, douceur | exclut `OUI` **et** `INGREDIENT_ALCOOLISE` |

### 4.2 Les contraintes du moteur

**Dures — le moteur ne les enfreint jamais :**
budget net non dépassé · marge ≥ plancher de la gamme · préférences client
respectées · produit disponible sur la semaine de livraison · une seule
température par coffret · score de complétude suffisant · multiples et minimums
fournisseur respectés · capacité du contenant respectée · jamais de coffret vide.

**Souples — le moteur les optimise :**
taux de remplissage du budget (objectif principal) · valeur perçue · caractère
local · noblesse · marge · diversité des producteurs.

### 4.3 Pseudo-code

```
FONCTION composer(demande) -> ResultatMoteur

  ── 0. Budget net ─────────────────────────────────────────────
  contenant  = choisir_contenant(demande.budget, demande.gabarits)
  budget_net = demande.budget
             - contenant.cout
             - emballage_et_protection
             - personnalisation(demande.options)
             - reserve_securite                    // paramètre back-office

  SI budget_net < prix_du_produit_eligible_le_moins_cher ALORS
      RETOURNER Echec(BUDGET_INSUFFISANT, budget_minimum_atteignable = ...)
      // ← on ne renvoie JAMAIS un coffret vide : on explique, avec un chiffre
  FIN SI

  ── 1. Filtrage dur ───────────────────────────────────────────
  candidats = catalogue.actifs()
      |> score_completude >= SEUIL_COMPLETUDE      // aucune donnée douteuse dans un devis
      |> disponible(semaine_de_livraison)
      |> prix_vente_ht renseigné et > 0
      |> conforme(demande.preferences)             // alcool, bio, normand, français, premium
      |> expediable ET temperature == demande.temperature
      |> prix_unitaire <= budget_net               // ← un produit seul plus cher que le budget
                                                   //   est écarté ici, jamais proposé en dépassement
  SI candidats vide ALORS
      RETOURNER Echec(AUCUN_CANDIDAT, preferences_incompatibles)

  ── 2. Une proposition par univers ────────────────────────────
  propositions = []
  POUR CHAQUE gabarit DANS gabarits_eligibles(demande)
      c = composer_un(gabarit, candidats, budget_net, graine)
      SI c != NUL ALORS propositions.ajouter(c)
  FIN POUR

  ── 3. Diversification ────────────────────────────────────────
  // deux propositions qui partagent 80 % de leurs produits n'en font qu'une
  propositions = filtrer_par_similarite(propositions, jaccard_max = 0,6)
  propositions = trier_par(taux_remplissage DESC, desirabilite DESC)
  propositions = 3 à 5 premières

  SI propositions vide ALORS
      RETOURNER Echec(AUCUNE_COMPOSITION, diagnostic_par_univers)
  RETOURNER Succes(propositions)
FIN
```

```
FONCTION composer_un(gabarit, candidats, budget_net, graine) -> Composition | NUL

  ── a. Allocation du budget aux slots ─────────────────────────
  POUR CHAQUE slot DANS gabarit.slots
      enveloppe[slot] = budget_net × slot.part_cible
  FIN POUR
  retenus = {} ; reste = budget_net

  ── b. Remplissage glouton dirigé ─────────────────────────────
  POUR CHAQUE slot DANS gabarit.slots TRIÉS PAR (requis DESC, part_cible DESC)

      cout_min_restant = Σ prix_minimum(s) POUR s DANS slots_requis_non_traités
      plafond_slot     = min(enveloppe[slot] × slot.part_max, reste - cout_min_restant)

      pool = candidats
           |> categorie ∈ slot.categories_admises
           |> pas déjà retenu
           |> max 2 produits du même producteur dans le coffret
           |> max 2 produits de la même sous-catégorie
           |> prix <= plafond_slot

      SI pool vide ALORS
          SI slot.requis ALORS RETOURNER NUL     // cet univers n'est pas proposable
                                                 // on ne bricole pas un coffret bancal
          SINON CONTINUER
      FIN SI

      // on cherche à REMPLIR, pas à économiser
      choix = argmax sur pool de :
                  w1 × proximite(prix, enveloppe[slot])
                + w2 × score_valeur_percue
                + w3 × score_local        × poids_preference_locale
                + w4 × score_noblesse
                - w5 × penalite_marge
                + bruit_deterministe(graine, produit.id)   // départage stable et rejouable

      retenus[slot] = choix ; reste = reste - choix.prix
  FIN POUR

  ── c. Réparation : ne pas laisser de budget sur la table ─────
  iterations = 0
  TANT QUE reste > SEUIL_RESTE ET iterations < MAX_ITERATIONS
      iterations++
      // montée en gamme : échanger un produit contre un meilleur du même slot
      echange = argmax sur (slot, remplacant) de gain_desirabilite
                sous contrainte prix(remplacant) - prix(actuel) <= reste
      SI echange existe ALORS appliquer(echange)
      SINON SI un slot optionnel peut être rempli avec reste ALORS remplir_le
      SINON SORTIR                                  // remplissage maximal atteint
      recalculer reste
  FIN TANT QUE

  ── d. Garde-fous : vérifiés, jamais supposés ─────────────────
  VERIFIER total_ht          <= budget_net           // invariant : jamais de dépassement
  VERIFIER retenus non vide                          // invariant : jamais de coffret vide
  VERIFIER nb_pieces         <= gabarit.pieces_max
  VERIFIER encombrement      <= contenant.capacite
  VERIFIER marge             >= plancher(gabarit.gamme)
  VERIFIER multiples et minimums fournisseur respectés
  SI une vérification échoue ALORS journaliser(diagnostic) ; RETOURNER NUL

  RETOURNER Composition(retenus, contenant,
                        taux_remplissage = total / demande.budget)
FIN
```

### 4.4 Déterminisme

La graine vaut `hash(budget, quantité, préférences, semaine, version_catalogue)`.
Conséquence : **la même demande produit toujours les mêmes propositions**, le PDF
correspond toujours à ce que le client a vu à l'écran, et un devis est rejouable
six mois plus tard pour comprendre ce qui s'est passé. Sans cela, un client qui
recharge la page voit d'autres coffrets et vous perdez la vente.

### 4.5 Performance

Cible : moins de 300 ms pour 5 propositions sur un catalogue actif de 200
références. Le filtrage se fait sur un index en mémoire chargé en une requête,
le glouton est en O(slots × pool), la réparation est bornée par `MAX_ITERATIONS`.
Un cache par empreinte de demande évite de recalculer à chaque rechargement.

### 4.6 Cas limites — ce sont les tests obligatoires

| Cas | Comportement attendu | Test |
|---|---|---|
| Budget inférieur au produit le moins cher + contenant | `Echec(BUDGET_INSUFFISANT)` avec le budget minimum atteignable affiché au client. **Jamais un coffret vide.** | `MoteurTest::test_budget_trop_bas_retourne_erreur_chiffree` |
| Un produit unique dépasse le budget | Écarté au filtrage. **Jamais proposé en dépassement.** | `test_produit_hors_budget_jamais_propose` |
| Catalogue partiellement indisponible | Les univers dont un slot requis n'est plus servi ne sont pas proposés. Les autres le sont, avec moins de choix. **Jamais de slot vide silencieux.** | `test_indisponibilite_partielle_degrade_sans_mentir` |
| Catalogue totalement indisponible | `Echec(AUCUN_CANDIDAT)` + alerte administrateur | `test_catalogue_vide` |
| Budget très élevé | Plafond de pièces respecté, montée en gamme plutôt que multiplication des produits | `test_budget_eleve_monte_en_gamme` |
| Préférences contradictoires (bio + sans alcool + normand confirmé) | Échec explicite nommant la préférence à relâcher | `test_preferences_incompatibles` |
| Budget atteint à l'euro près | Taux de remplissage = 100 %, aucun dépassement d'un centime | `test_remplissage_exact` |
| Deux exécutions identiques | Résultats strictement identiques | `test_determinisme` |

### 4.7 Calcul de la TVA — également testé unitairement

```
FONCTION calculer_totaux(lignes) -> Totaux
  // par ligne, jamais globalement
  POUR CHAQUE ligne DANS lignes
      base_ht[ligne.taux] += ligne.prix_ht_centimes × ligne.quantite
  FIN POUR
  // l'arrondi se fait par TAUX, au niveau du sous-total,
  // pas ligne par ligne : sinon dérive de quelques centimes sur un gros coffret
  POUR CHAQUE taux DANS base_ht
      tva[taux] = arrondi_au_centime(base_ht[taux] × taux)
  FIN POUR
  RETOURNER Totaux(base_ht par taux, tva par taux, total_ht, total_ttc)
FIN
```

Taux appliqués : **5,5 %** sur l'alimentaire · **20 %** sur les boissons
alcoolisées · **20 %** sur le contenant, l'emballage, la personnalisation, les
frais de port et la prestation de composition.

Cas de test obligatoires : coffret mono-taux · coffret mixte 5,5/20 · arrondi au
demi-centime · remise B2B répartie proportionnellement sur les bases par taux
(une remise globale doit être ventilée, sinon la TVA est fausse) · frais de port ·
acompte (la TVA de l'acompte suit la ventilation de la commande) · avoir partiel.

---

## 5. Du devis à la commande

### 5.1 Machine à états du devis

```
BROUILLON → ENVOYE → VU → ACCEPTE → ACOMPTE_PAYE → CONFIRMEE
                  ↘ EXPIRE   ↘ REFUSE        ↘ A_VALIDER (revue manuelle)
```

`A_VALIDER` est le garde-fou du §2.2 : au-delà d'un plafond de montant ou de
quantité, ou si la marge est limite, le devis ne part pas seul. Vous recevez une
notification et vous validez d'un clic. Tout le reste est automatique, comme
demandé.

### 5.2 Ce qui se passe à l'acceptation

Le devis **n'est pas** une commande WooCommerce. À l'acceptation en ligne :

1. Horodatage de l'acceptation + version des CGV acceptées (B2B ou B2C).
2. Création d'une commande WooCommerce (statut « en attente de paiement »).
3. **La composition est projetée en lignes de commande réelles** : un produit =
   une ligne, avec sa classe de taxe. Plus les lignes contenant, emballage,
   personnalisation et port, en 20 %. C'est ce qui permet à WooCommerce de
   calculer la TVA correctement, tout seul, jusque dans l'export comptable.
4. Les prix sont **gelés** : ceux du devis, jamais recalculés depuis le catalogue.
5. Paiement de l'acompte via Stripe ou Mollie. Facture d'acompte émise.
6. La commande passe en `CONFIRMEE` et entre dans la liste de courses de la semaine.

### 5.3 Substitutions — au moment de la préparation, pas de la composition

Le moteur compose sur des produits disponibles. La substitution intervient plus
tard, quand un producteur est en rupture le jour de l'achat :

1. Vous marquez le produit indisponible sur l'écran de disponibilité.
2. Le système propose le substitut principal, puis celui de secours, en vérifiant
   que sa valeur est **égale ou supérieure** et que le régime (alcool, allergènes,
   bio) est identique.
3. La ligne de commande est remplacée, l'écart de valeur reste à votre charge.
4. Une entrée est écrite dans `wp_cdc_substitution` — journal non modifiable.
5. Le client voit « produit équivalent de valeur égale ou supérieure » dans son
   espace et dans les emails. **Le bon de livraison et la facture nomment le
   produit réel** (allergènes — voir §2.2 et §6).

### 5.4 Liste de courses hebdomadaire

Source : les commandes confirmées dont la livraison tombe dans la semaine visée.
Agrégation par fournisseur puis par produit, quantités arrondies au multiple de
commande, minimums et règles de panachage appliqués, écart (surplus) affiché.
Export CSV et PDF par fournisseur, envoi par email. La liste est **figée** en base
à la génération : un rapport recalculé à la volée n'est pas auditable et ne permet
pas de comparer commandé et reçu.

---

## 6. Conformité, traitée dès l'architecture

| Obligation | Où c'est implémenté |
|---|---|
| Mentions légales, politique de confidentialité | Pages WordPress, liens en pied de page |
| **CGV B2B et B2C distinctes** | Deux documents versionnés. La version acceptée est stockée sur le devis et sur la commande — indispensable en cas de litige |
| Droit de rétractation B2C (14 jours) | Formulaire type fourni. **Attention aux exceptions** : les denrées périssables et les biens confectionnés selon les spécifications du consommateur (coffret personnalisé) en sont exclus. Les CGV B2C doivent dire clairement ce qui est rétractable et ce qui ne l'est pas — sinon la clause est réputée non écrite |
| RGPD — registre | Document tenu hors site, modèle fourni |
| RGPD — consentement | Double opt-in pour la prospection B2C, horodaté. **Point d'attention sur l'import des 3 000 contacts** |
| RGPD — export et suppression | Branchement des tables custom sur `wp_privacy_personal_data_exporters` et `_erasers`. **Sans cela l'export natif de WordPress est incomplet** et ne répond pas à une demande d'accès |
| RGPD — durées de conservation | Purge automatique des devis non transformés, des jetons publics et des journaux |
| Cookies | Bandeau conforme, mesure d'audience exemptée ou consentie |
| Facturation | Numérotation continue, mentions obligatoires, **TVA détaillée par taux**, facture d'acompte, conservation 10 ans |
| **Facturation électronique** | La réforme française impose la **réception** de factures électroniques par toutes les entreprises depuis le 1<sup>er</sup> septembre 2026, l'émission arrivant par vagues. Pour du B2B, il faut prévoir un raccordement à une plateforme agréée plutôt qu'un PDF maison. **À vérifier avec votre expert-comptable — c'est déjà d'actualité.** |
| Vente d'alcool | Vérification d'âge au tunnel, interdiction de vente aux mineurs affichée, mention sanitaire obligatoire sur les pages et les documents. Encadrement publicitaire (loi Évin) — **cela vise aussi vos campagnes email** |
| Allergènes | Champ obligatoire par produit, affiché avant la conclusion de la vente et sur la page « composition de votre coffret » |
| Accessibilité | Configurateur utilisable au clavier et lisible au lecteur d'écran. L'obligation légale ne vise pas une TPE, mais un configurateur inutilisable au clavier perd des clients |

*Les points juridiques ci-dessus sont des points d'attention issus de l'analyse
technique. Ils doivent être validés par votre conseil juridique et votre
expert-comptable ; ils ne constituent pas un avis juridique.*

---

## 7. Extensions tierces

### 7.1 Recommandées

| Extension | Rôle | Pourquoi celle-là |
|---|---|---|
| **WooCommerce Stripe** ou **Mollie** (officielles) | Paiement | Maintenues par l'éditeur, PCI hors de notre code, acompte et remboursement partiel gérés |
| **WooCommerce PDF Invoices & Packing Slips** | Factures, bons de livraison | Gratuit, solide, très répandu. Les **devis** restent générés par notre plugin |
| **Dompdf** (bibliothèque Composer, pas plugin) | Génération PDF | Embarqué dans le plugin, aucune dépendance externe |
| **Brevo / Postmark / Mailgun** + WP Mail SMTP | Délivrabilité transactionnelle | Un devis qui part en spam est une vente perdue. `wp_mail()` seul ne suffit pas |
| **Complianz** ou **Axeptio** | Cookies et RGPD | |
| **Rank Math** *ou* **Yoast** — un seul | SEO | |
| **Solid Security** ou **Wordfence** + 2FA | Sécurité | |
| **UpdraftPlus** ou les sauvegardes de l'hébergeur | Sauvegardes | Une seule des deux |
| Cache de l'hébergeur (LiteSpeed, Kinsta) ou **WP Rocket** | Performance | **Avec exclusion du configurateur, du panier et du compte** — voir §2.2 point 8 |
| **PHPUnit + Brain Monkey**, **PHPCS + WordPress-Coding-Standards**, **PHPStan** | Qualité | Exigés par le brief |

### 7.2 À éviter, et pourquoi

| À éviter | Raison |
|---|---|
| **Elementor, Divi, WPBakery** sur les pages métier | Performance, verrouillage propriétaire, et incompatible avec l'exigence « le thème doit rester remplaçable » |
| **Product Bundles / Composite Products** | Ils imposent leur modèle de prix et leur interface. Ils ne savent ni remplir un budget, ni ventiler la TVA comme demandé. *(Envisageables uniquement si vous renoncez au moteur.)* |
| Plugins « **Request a Quote** » (YITH, Addify…) | Cycle de vie et PDF non maîtrisés, incompatibles avec la génération automatique de 3 à 5 propositions |
| Plugins de **multi-adresses** du marché | Aucun n'est fiable à ce niveau et tous touchent au tunnel de commande. À écrire nous-mêmes ou à repousser en v2 |
| **ACF / JetEngine / Toolset** pour le modèle métier | Dépendance lourde sur le cœur du produit, et données non testables unitairement. ACF reste acceptable pour l'éditorial |
| **Dokan, WCFM** (multi-vendeurs) | Hors sujet : vos producteurs sont des fournisseurs, pas des vendeurs |
| **Avalara** et consorts | Surdimensionné pour de la TVA franco-française |
| Deux plugins de cache, de SEO ou de sécurité | Conflits garantis |
| Thèmes « multipurpose » de places de marché | Ils embarquent leur propre logique e-commerce, exactement ce qu'on veut éviter |
| **WP All Import** pour l'import catalogue | La base a ses propres règles (« À CONFIRMER », substituts, scores, conflits). Un importeur maison dans le plugin est plus court à écrire qu'à configurer, et testable |

---

## 8. Lotissement proposé

| Lot | Contenu | Dépend de |
|---|---|---|
| **0. Données** | Prix de vente, contenants, photos, dimensions, catalogue de saison, arbitrage des 42 TVA « À CONFIRMER » | **Vous.** Chemin critique du projet |
| 1. Socle | Plugin, schéma, import CSV, back-office catalogue et producteurs | Hébergement tranché |
| 2. Moteur | Gabarits, algorithme, tests unitaires moteur + TVA | Lot 0 (prix), lot 1 |
| 3. Configurateur | Parcours en 5 écrans, propositions, personnalisation | Lot 2, photos |
| 4. Devis | PDF, emails, acceptation en ligne, tableau de bord | Lot 3 |
| 5. Commande | Projection en commande Woo, TVA par ligne, acompte, factures | Lot 4 |
| 6. Exploitation | Disponibilité hebdomadaire, liste de courses, substitutions | Lot 5 |
| 7. Conformité et B2B | CGV, RGPD, comptes pros, HT/TTC, paliers dégressifs, import des 3 000 contacts | Lot 5 |
| 8. v2 | Multi-destinataires | Après mise en ligne |

---

## 9. Ce que j'attends de vous pour passer à l'étape 2

1. La décision d'hébergement (§0.1).
2. Les réponses aux huit questions bloquantes (§1.1).
3. L'arbitrage sur le multi-destinataires en v1 ou en v2 (§2.2 point 6).
4. Votre accord sur le principe : générique dans le devis, nominatif sur le bon de
   livraison et la facture (§2.2 point 2).
5. La validation de cette architecture, ou vos corrections.

Le code commencera après.
