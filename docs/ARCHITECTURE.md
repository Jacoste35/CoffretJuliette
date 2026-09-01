# Comptoir des Chatonniers — Étape 1 (révisée) : cadrage et architecture

**Statut : proposition soumise à validation. Aucune ligne de code applicatif n'a été écrite.**

> **Révision du 1er septembre 2026.** La première version de ce document proposait
> une architecture WordPress + WooCommerce. Vous avez tranché en faveur d'un
> développement Next.js déployé sur Vercel (option C du cadrage initial). Comme
> annoncé, ce choix impose de refaire le cadrage technique : c'est l'objet de cette
> version. La version WooCommerce reste consultable dans l'historique Git.

## Décisions actées

| Sujet | Décision | Conséquence |
|---|---|---|
| **Pile technique** | Next.js + Vercel, sans WordPress | Tout le back-office est à construire. Voir §1.2 |
| **Multi-destinataires** | Reporté en v2 | v1 = livraison groupée sur un site unique. Le modèle de données le prévoit dès maintenant |
| **Prix de vente** | Saisis produit par produit | 703 saisies. Voir §0.2 : un classeur de saisie est fourni, et je recommande de commencer par un catalogue de saison |

---

## 0. L'état réel du point de départ

### 0.1 Ce qui est déjà là, et qui est précieux

Le dépôt contient une base produits sérieuse, construite avec une discipline rare :
703 produits, 32 fournisseurs, 3 020 alternatives qualifiées, des scores, et une
traçabilité jusqu'à la ligne du document source. Rien n'a été inventé ; tout ce qui
manque est marqué « À CONFIRMER » plutôt que comblé au plus probable.

Cette base est réutilisable **telle quelle** : elle devient la source d'import de
la base de données. Le travail de données le plus difficile est fait à 80 %.

### 0.2 Ce qui manque, et qui reste le chemin critique

| Donnée | État | Impact |
|---|---|---|
| `prix_vente_ht` | **0 / 703** | Le moteur compose sur un prix de vente. **Bloquant absolu.** |
| `url_photo` | **0 / 703** | Un configurateur sans visuel ne convertit pas |
| Dimensions (L/l/h) | **0 / 703** | Impossible de savoir combien de produits rentrent dans une boîte |
| `poids_net_g` | 481 / 703 | Frais de port approximatifs sur un tiers du catalogue |
| `description` | 183 / 703 | 74 % des fiches sont vides |
| `personnalisable` | **703 / 703 « À CONFIRMER »** | Aucune personnalisation vendable aujourd'hui |
| `tva_taux` | 42 « À CONFIRMER » | 42 produits inutilisables tant que le taux n'est pas tranché |
| Tarifs emballages / transport | Tables vides | Coût de revient et frais de port non calculables |

### 0.3 Trois anomalies trouvées dans la base, à corriger avant l'import

En analysant le fichier, trois lignes posent un problème réel — pas de simples
« À CONFIRMER », mais des valeurs qui produiraient une erreur visible par le client.

| Produit | Problème | Conséquence si rien n'est fait |
|---|---|---|
| **PROD-0297** et **PROD-0309** — « Calvados Arrangé Kumquat Café » 70 cl et 20 cl | Classés en catégorie `BOISSON_SANS_ALCOOL`, sous-catégorie `CAFE`. La règle de classification 30 a accroché le mot « café » avant de voir « Calvados ». Le champ `alcool` dit bien `INGREDIENT_ALCOOLISE`, mais la catégorie, elle, est fausse | Un **Calvados dans un coffret « Sans alcool »**. C'est exactement le genre d'erreur qui coûte un client entreprise, et c'est l'argument le plus concret en faveur de la recommandation n° 7 : exclure `INGREDIENT_ALCOOLISE` par défaut |
| **PROD-0458** — « Hydromel 75 cl » | Boisson alcoolisée (`alcool = OUI`) au taux de **5,5 %** | Facture fausse sur un produit alcoolisé |

Ces trois lignes seront bloquées à l'import par le score de complétude et
remontées dans le rapport d'anomalies plutôt que corrigées en silence — conformément
à la discipline de votre base. **Mais elles montrent surtout pourquoi le moteur doit
refuser tout produit dont les données ne sont pas fiables** : ici, deux produits
seraient passés dans un coffret sans alcool sans qu'aucune alerte ne se déclenche.

**Le chemin critique de ce projet n'est pas le code, c'est la complétion de cette
base.** Le développement peut avancer en parallèle, mais rien ne peut être mis en
ligne sans le lot 0.

Pour vous permettre de démarrer immédiatement, un classeur de saisie est fourni :
`data/base-produits-noel/saisie/SAISIE_PRIX_DE_VENTE.xlsx`. Il reprend les 703
produits avec leur prix d'achat, calcule marge et taux de marge en direct dès que
vous saisissez un prix, et se réimporte tel quel.

**Recommandation forte : ne saisissez pas 703 prix.** Commencez par le catalogue de
saison — 120 à 200 références que vous savez pouvoir obtenir. Le classeur est trié
par catégorie puis par niveau de gamme pour rendre l'arbitrage rapide, et une
colonne `retenu_catalogue_saison` permet de marquer la sélection.

---

## 1. Ce que le changement de pile implique

### 1.1 Ce qui ne change pas

Les règles métier, le moteur de composition, le calcul de TVA, la logique de
substitution, la liste de courses et les obligations de conformité sont
**indépendants de la pile technique**. Tout ce travail de conception reste valable ;
il change simplement de langage d'implémentation, de PHP vers TypeScript — au
passage, c'est un gain : le moteur devient testable avec Vitest en quelques
millisecondes, sans bootstrap d'aucun framework.

### 1.2 Ce que ça coûte, dit franchement

WooCommerce apportait gratuitement un ensemble de choses qu'il faut désormais
écrire. Ce n'est pas un argument pour revenir en arrière — la décision est prise —
mais il faut le regarder en face pour dimensionner correctement le v1.

| Fonction | Avec WooCommerce | Avec Next.js |
|---|---|---|
| Back-office commandes | Fourni | **À construire** |
| Fiches produits, catalogue admin | Fourni | **À construire** |
| Comptes clients, mots de passe, réinitialisation | Fourni | Supabase Auth couvre l'essentiel |
| Moteur de taxes | Fourni | **À construire** — mais c'était déjà prévu, la TVA par ligne dépassait Woo |
| Emails transactionnels | Fournis | **À construire** (React Email + Resend) |
| Factures, bons de livraison | Extension gratuite | **À construire** |
| Remboursements, avoirs | Fourni | **À construire** |
| Zones et frais de port | Fourni | **À construire** — simplifié en v1 |
| Codes promo | Fourni | Hors périmètre v1 |
| Export comptable | Extensions | **À construire** |
| Cookies, RGPD, export de données | Extensions | **À construire** |

**Conséquence directe : le périmètre v1 doit être réduit pour compenser.** Le §9
propose un périmètre resserré qui reste vendable et qui tient la route. Vouloir
répliquer WooCommerce à l'identique en repartant de zéro est le meilleur moyen de
ne jamais mettre le site en ligne.

### 1.3 Ce qu'on gagne

- Un configurateur réellement fluide : c'est le cœur de la vente, et une interface
  React sur mesure fera mieux qu'un tunnel WooCommerce contorsionné.
- Le coffret n'est plus un « produit bizarre » qu'il faut faire rentrer de force
  dans un modèle e-commerce classique. C'est une **composition**, modélisée telle
  quelle.
- La TVA par ligne, les prix gelés, les substitutions, les commandes mère/filles :
  tout cela devient naturel au lieu de lutter contre le modèle de Woo.
- Pas de mises à jour de plugins qui cassent le site, pas de rustines de sécurité
  WordPress à surveiller.

---

## 2. Pile technique

| Couche | Choix | Justification |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript strict** | Server Components pour le catalogue, Server Actions pour les formulaires, rendu serveur pour le SEO |
| Hébergement | **Vercel** | Décision actée |
| Base de données | **Supabase (PostgreSQL 17)** | Vous avez déjà le projet `ooogbitnoqvrtwrpisnn`, région **eu-central-1 (Francfort)** — hébergement dans l'UE, ce qui simplifie le volet RGPD. **Il est actuellement en pause, il faudra le réactiver.** |
| Accès aux données | **Drizzle ORM + drizzle-kit** | Plus léger que Prisma en serverless, migrations SQL versionnées et lisibles, typage complet |
| Connexions | **Pooler Supabase (mode transaction)** | Les fonctions serverless ouvrent trop de connexions. Point classique de panne en production : à câbler dès le départ, pas après |
| Authentification | **Supabase Auth** | Comptes clients B2C, comptes pros à valider, rôle admin. Un système de moins à écrire |
| Stockage fichiers | **Supabase Storage** | Photos produits, PDF de devis et factures. Le disque de Vercel est éphémère : rien ne doit y être écrit |
| Paiement | **Stripe** (Checkout + Payment Intents) | Acompte puis solde en deux intentions. Aucune donnée bancaire dans notre code |
| Emails | **Resend + React Email** | Devis, relances, confirmations. Domaine à authentifier (SPF/DKIM) : un devis en spam est une vente perdue |
| PDF | **@react-pdf/renderer** | Rendu en fonction Node sur Vercel. Puppeteer est trop lourd pour du serverless |
| Tâches planifiées | **Vercel Cron** | Liste de courses hebdomadaire, expiration des devis, relances |
| Interface | **Tailwind CSS + shadcn/ui** | Composants possédés, pas une dépendance qui impose son style |
| Tests | **Vitest** (domaine), **Playwright** (parcours) | Le moteur et la TVA sont testés sans base de données ni réseau |
| Qualité | ESLint, Prettier, `tsc --noEmit`, Zod | Toute entrée utilisateur validée par un schéma Zod |

### Points de vigilance propres à Vercel

- **Le système de fichiers est éphémère.** Aucun PDF, aucune image, aucun cache ne
  peut être écrit sur disque. Tout passe par Supabase Storage.
- **Timeout des fonctions.** Génération de PDF et gros imports doivent rester courts
  ou passer par une file d'attente. Le moteur vise moins de 300 ms, ça passe large.
- **Cold start + pooling.** Sans pooler, la base sature. À configurer d'emblée.
- **Le webhook Stripe est la source de vérité du paiement**, jamais le retour
  navigateur. Vérification de signature obligatoire, traitement idempotent.
- **Secrets en variables d'environnement Vercel.** La clé de service Supabase ne
  doit jamais atteindre le navigateur.

---

## 3. Arborescence

```
coffret-juliette/
├── app/
│   ├── (site)/                       pages publiques
│   │   ├── page.tsx                  accueil
│   │   ├── entreprises/ particuliers/
│   │   ├── coffrets/                 univers, exemples de compositions
│   │   ├── producteurs/              storytelling terroir (SEO)
│   │   └── legal/                    mentions, CGV B2B, CGV B2C, confidentialité
│   ├── (configurateur)/
│   │   └── composer/                 ← le parcours en 5 étapes, cœur de la vente
│   ├── (compte)/
│   │   ├── devis/[token]/            consultation et acceptation d'un devis
│   │   └── commandes/
│   ├── (admin)/admin/
│   │   ├── page.tsx                  tableau de bord : devis du jour, alertes
│   │   ├── catalogue/                produits, prix, photos, complétude
│   │   ├── disponibilite/            saisie hebdomadaire par producteur
│   │   ├── gabarits/                 édition des univers sans toucher au code
│   │   ├── devis/ commandes/
│   │   ├── substitutions/            journal d'audit
│   │   ├── liste-courses/            génération et export par fournisseur
│   │   └── parametres/               paramètres du moteur
│   └── api/
│       ├── stripe/webhook/           source de vérité du paiement
│       └── cron/                     liste de courses, expiration, relances
│
├── src/
│   ├── domain/                       ← ZÉRO dépendance. 100 % testable.
│   │   ├── catalogue/                Produit, Substituts, Regime, Completude
│   │   ├── composition/
│   │   │   ├── gabarit.ts            un univers = une liste de slots
│   │   │   ├── slot.ts
│   │   │   ├── contraintes.ts
│   │   │   ├── moteur.ts             ← l'algorithme (§5)
│   │   │   ├── selecteur.ts
│   │   │   ├── reparateur.ts
│   │   │   ├── diversificateur.ts
│   │   │   └── resultat.ts           propositions ou diagnostic d'échec explicite
│   │   ├── tarification/
│   │   │   ├── calcul-tva.ts         ← testé unitairement, par ligne (§6)
│   │   │   ├── centimes.ts           entiers, jamais de float
│   │   │   └── palier-remise.ts      dégressif B2B
│   │   ├── devis/                    états, politique de validation
│   │   └── approvisionnement/        agrégation, arrondi au conditionnement
│   │
│   ├── db/
│   │   ├── schema/                   tables Drizzle, une par domaine
│   │   ├── migrations/               SQL versionné
│   │   ├── queries/                  lectures typées
│   │   └── client.ts                 pooler
│   │
│   ├── services/                     orchestration : domaine ↔ base ↔ Stripe ↔ email
│   │   ├── composition-service.ts
│   │   ├── devis-service.ts
│   │   ├── commande-service.ts
│   │   ├── paiement-service.ts
│   │   ├── liste-courses-service.ts
│   │   └── substitution-service.ts
│   │
│   ├── pdf/                          devis, facture, bon de livraison
│   ├── emails/                       gabarits React Email
│   ├── auth/                         Supabase Auth, rôles, garde d'accès admin
│   ├── rgpd/                         export et effacement des données d'une personne
│   └── lib/                          Zod, formatage, hachage déterministe
│
├── scripts/
│   ├── import-catalogue.ts           CSV de data/ → base, avec rapport d'anomalies
│   └── seed-gabarits.ts
│
├── tests/
│   ├── unit/
│   │   ├── moteur.test.ts            ← obligatoire, cas limites du §5.6
│   │   ├── calcul-tva.test.ts        ← obligatoire
│   │   ├── palier-remise.test.ts
│   │   └── liste-courses.test.ts
│   └── e2e/                          Playwright : parcours complet devis → acompte
│
├── drizzle.config.ts
├── vitest.config.ts
└── vercel.json                       cron
```

**La règle structurante :** `src/domain/` n'importe rien — ni Next, ni Drizzle, ni
Supabase, ni Stripe. Que du TypeScript. C'est ce qui rend les tests unitaires
obligatoires réellement faisables, et ce qui protège la logique métier du prochain
changement de pile.

---

## 4. Modèle de données (PostgreSQL)

Nous possédons désormais tout le schéma : plus de compromis avec le modèle d'un
CMS. Les montants sont stockés en **entiers, en centimes** — jamais en flottants.

### Catalogue

| Table | Contenu |
|---|---|
| `producteur` | Les 32 fournisseurs : adresse, conditions, panachage, minimum, délais, canal |
| `produit` | Fiche complète, alignée sur `PRODUITS.csv`. Dont `prix_achat_ht`, `prix_vente_ht`, `taux_tva`, `alcool`, `regime_alcool`, `poids_g`, `encombrement`, `temperature`, `expediable`, `niveau_gamme`, `origine`, `niveau_preuve_origine`, `allergenes`, **`score_completude`** |
| `produit_score` | Noblesse, valeur perçue, local, Noël, logistique |
| `produit_substitut` | Substitut principal et de secours, issus de `PRODUITS_ALTERNATIVES.csv` |
| `produit_prix_histo` | Historique des prix — un devis de mars ne doit jamais être relu avec les prix de juin |
| `disponibilite` | Produit × semaine ISO. **Le cœur du modèle sans stock** |
| `contenant` | Boîtes et paniers : coût, capacité, dimensions |
| `categorie`, `label` | Référentiels |

### Composition et devis

| Table | Contenu |
|---|---|
| `gabarit` / `gabarit_slot` | Les univers, éditables en back-office **sans toucher au code** |
| `composition` | Gabarit, budget cible, totaux, taux de remplissage, marge, empreinte déterministe |
| `composition_ligne` | Produit, quantité, **prix gelé**, taux de TVA, slot |
| `devis` | Numéro, client, état, dates d'envoi / de vue / de validité, jeton public, montants, **version des CGV acceptées** |
| `devis_composition` | Un devis porte plusieurs coffrets |

### Commande et paiement

| Table | Contenu |
|---|---|
| `client` | Particulier ou professionnel, SIRET, TVA intracom, statut de validation |
| `adresse` | Facturation, livraison |
| `commande` | **`commande_mere_id` nullable** — le multi-destinataires est reporté en v2, mais la colonne existe dès la v1 pour ne pas avoir à migrer plus tard |
| `commande_ligne` | Une ligne par produit, avec son taux. Plus les lignes contenant, emballage, personnalisation, port |
| `destinataire` | Prévu, alimenté en v2 |
| `paiement` | Acompte et solde, identifiants Stripe, statut |
| `facture` | Numérotation continue, ventilation TVA par taux, PDF stocké |
| `substitution` | **Journal d'audit non modifiable** : produit prévu, produit livré, motif, écart de valeur, opérateur, horodatage |

### Exploitation et conformité

| Table | Contenu |
|---|---|
| `liste_courses` / `liste_courses_ligne` | Liste hebdomadaire **figée** à la génération |
| `cgv_version` | Documents versionnés — indispensable en cas de litige |
| `consentement` | Base légale, horodatage, preuve. Pour les 3 000 contacts comme pour les nouveaux |
| `journal_audit` | Devis émis, échecs du moteur, imports, actions d'administration |
| `parametre_moteur` | Les 15 paramètres, modifiables sans déploiement |

### Sécurité d'accès

Row Level Security activée sur toutes les tables portant des données personnelles.
Le client ne lit que ses propres devis et commandes ; l'accès à un devis par jeton
public passe par une fonction dédiée, à jeton non devinable et à durée de vie
limitée. La clé de service ne quitte jamais le serveur.

---

## 5. Le moteur de composition

Cette partie est **inchangée** par rapport au cadrage initial : elle ne dépend pas
de la pile technique. Elle s'implémente dans `src/domain/composition/`, en
TypeScript pur.

### 5.1 Le concept central : le gabarit d'univers

Un univers n'est pas une liste de produits, c'est une **structure de coffret**.
« Le Normand » = un salé local + un sucré local + une boisson normande + une
douceur + un extra. Chaque emplacement est un **slot** portant un rôle, les
catégories admises, une part de budget cible et maximale, et le caractère
obligatoire ou non.

C'est ce qui rend le moteur explicable, bornable et pilotable par vous plutôt que
par le code. Un knapsack pur maximiserait le remplissage en proposant cinq pots de
confiture : mathématiquement optimal, commercialement invendable.

| Univers | Slots types | Contrainte propre |
|---|---|---|
| Le Normand | salé local, sucré local, boisson normande, douceur, extra | Origine Normandie **confirmée** — 68 produits aujourd'hui |
| Le Gourmand | salé, sucré, biscuiterie, boisson, douceur | Équilibre sucré / salé |
| Le Prestige | pièce maîtresse, accompagnement, boisson d'exception, douceur | Gamme ≥ Premium, part de la pièce maîtresse ≥ 35 % |
| Le Responsable | 3 à 5 slots, tous bio ou local | Label bio ou origine confirmée |
| Le Sans alcool | salé, sucré, boisson sans alcool, douceur | Exclut `OUI` **et** `INGREDIENT_ALCOOLISE` |

### 5.2 Les contraintes

**Dures — jamais enfreintes :** budget net non dépassé · marge ≥ plancher de la
gamme · préférences client respectées · produit disponible sur la semaine de
livraison · une seule température par coffret · score de complétude suffisant ·
multiples et minimums fournisseur · capacité du contenant · **jamais de coffret
vide**.

**Souples — optimisées :** taux de remplissage du budget (objectif principal) ·
valeur perçue · caractère local · noblesse · marge · diversité des producteurs.

### 5.3 Pseudo-code

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
      RETOURNER Echec(BUDGET_INSUFFISANT, budget_minimum_atteignable)
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

  SI propositions vide ALORS RETOURNER Echec(AUCUNE_COMPOSITION, diagnostic_par_univers)
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
          SI slot.requis ALORS RETOURNER NUL     // cet univers n'est pas proposable ;
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
      SINON SORTIR                                 // remplissage maximal atteint
      recalculer reste
  FIN TANT QUE

  ── d. Garde-fous : vérifiés, jamais supposés ─────────────────
  VERIFIER total_ht     <= budget_net       // invariant : jamais de dépassement
  VERIFIER retenus non vide                 // invariant : jamais de coffret vide
  VERIFIER nb_pieces    <= gabarit.pieces_max
  VERIFIER encombrement <= contenant.capacite
  VERIFIER marge        >= plancher(gabarit.gamme)
  VERIFIER multiples et minimums fournisseur respectés
  SI une vérification échoue ALORS journaliser(diagnostic) ; RETOURNER NUL

  RETOURNER Composition(retenus, contenant, taux_remplissage = total / demande.budget)
FIN
```

### 5.4 Déterminisme

La graine vaut `hash(budget, quantité, préférences, semaine, version_catalogue)`.
Conséquence : **la même demande produit toujours les mêmes propositions**, le PDF
correspond toujours à ce que le client a vu à l'écran, et un devis reste rejouable
six mois plus tard. Sans cela, un client qui recharge la page voit d'autres
coffrets — et vous perdez la vente.

### 5.5 Performance

Cible : moins de 300 ms pour 5 propositions sur un catalogue actif de 200
références. Le catalogue actif tient en mémoire et se charge en une requête ; le
glouton est en O(slots × pool) ; la réparation est bornée. En serverless, un cache
par empreinte de demande évite de recalculer à chaque rechargement.

### 5.6 Cas limites — ce sont les tests obligatoires

| Cas | Comportement attendu | Test |
|---|---|---|
| Budget < produit le moins cher + contenant | `Echec(BUDGET_INSUFFISANT)` avec le budget minimum atteignable affiché. **Jamais un coffret vide.** | `budget_trop_bas_retourne_erreur_chiffree` |
| Un produit unique dépasse le budget | Écarté au filtrage. **Jamais proposé en dépassement.** | `produit_hors_budget_jamais_propose` |
| Catalogue partiellement indisponible | Les univers dont un slot requis n'est plus servi ne sont pas proposés ; les autres le sont. **Jamais de slot vide silencieux.** | `indisponibilite_partielle_degrade_sans_mentir` |
| Catalogue totalement indisponible | `Echec(AUCUN_CANDIDAT)` + alerte administrateur | `catalogue_vide` |
| Budget très élevé | Plafond de pièces respecté, montée en gamme plutôt que multiplication | `budget_eleve_monte_en_gamme` |
| Préférences contradictoires | Échec explicite nommant la préférence à relâcher | `preferences_incompatibles` |
| Budget atteint à l'euro près | Remplissage 100 %, aucun dépassement d'un centime | `remplissage_exact` |
| Deux exécutions identiques | Résultats strictement identiques | `determinisme` |

---

## 6. Calcul de la TVA

```
FONCTION calculer_totaux(lignes) -> Totaux
  // par ligne, jamais globalement
  POUR CHAQUE ligne DANS lignes
      base_ht[ligne.taux] += ligne.prix_ht_centimes × ligne.quantite
  FIN POUR
  // l'arrondi se fait par TAUX, au niveau du sous-total, pas ligne par ligne :
  // sinon dérive de quelques centimes sur un gros coffret
  POUR CHAQUE taux DANS base_ht
      tva[taux] = arrondi_au_centime(base_ht[taux] × taux)
  FIN POUR
  RETOURNER Totaux(base_ht par taux, tva par taux, total_ht, total_ttc)
FIN
```

### 6.1 La règle de votre brief est incomplète — et votre base a déjà raison

Le brief énonce « 20 % sur les alcools, 5,5 % sur l'alimentaire, 20 % sur les
accessoires et l'emballage ». En droit français, l'alimentaire n'est pas
uniformément à 5,5 % : **la confiserie, les chocolats et produits contenant du
chocolat, les margarines et graisses végétales et le caviar restent à 20 %**.

Ce n'est pas un détail sur votre catalogue : **`CONFISERIE` est votre plus grosse
catégorie, 152 produits**, et 143 d'entre eux portent déjà 20 % dans votre base.
Les caramels d'Isigny, les tuiles chocolat, la pâte de pommes : 151 produits
alimentaires non alcoolisés sont au taux normal. Appliquer 5,5 % « parce que c'est
alimentaire » aurait produit des factures fausses sur le cœur de votre offre.

**Conséquence sur l'architecture :** le taux ne se déduit jamais d'une catégorie ni
d'un indicateur « alimentaire / alcool ». Il est porté **par produit**, dans la
colonne `taux_tva`, alimentée depuis votre base et modifiable en back-office. Le
moteur et le calcul de TVA se contentent de lire cette valeur.

En pratique sur votre catalogue : **5,5 %** sur l'épicerie, la biscuiterie hors
chocolat, le traiteur et les boissons sans alcool · **20 %** sur les boissons
alcoolisées, la confiserie et le chocolat, la cosmétique, l'art de la table · et
**20 %** sur le contenant, l'emballage, la personnalisation, les frais de port et la
prestation de composition.

### 6.2 Point d'attention important

**Point d'attention important.** Une offre composite vendue pour un prix unique est
en principe une opération unique ; la ventilation par taux est admise, mais elle
doit reposer sur une répartition économiquement justifiée. C'est exactement ce que
produit le modèle ligne à ligne. Un coffret entier facturé à 5,5 % parce qu'il est
« alimentaire » est un redressement. *À faire valider par votre expert-comptable.*

Cas de test obligatoires : coffret mono-taux · coffret mixte 5,5/20 · arrondi au
demi-centime · **remise B2B répartie proportionnellement sur les bases par taux**
(une remise globale non ventilée fausse la TVA) · frais de port · acompte (sa TVA
suit la ventilation de la commande) · avoir partiel.

---

## 7. Du devis à la commande

### 7.1 États du devis

```
BROUILLON → ENVOYE → VU → ACCEPTE → ACOMPTE_PAYE → CONFIRMEE
                  ↘ EXPIRE   ↘ REFUSE        ↘ A_VALIDER (revue manuelle)
```

`A_VALIDER` est le garde-fou : au-delà d'un plafond de montant ou de quantité, ou
si la marge est limite, le devis ne part pas seul. Vous recevez une notification et
vous validez d'un clic. **Tout le reste est automatique, comme demandé.**

C'est une protection réelle, pas une précaution de principe : un devis émis et
envoyé sans relecture est une offre ferme. Une erreur de prix, et il faut l'honorer
ou entrer en litige. S'y ajoutent une durée de validité explicite (15 jours) et une
clause « sous réserve de disponibilité chez le producteur ».

### 7.2 À l'acceptation

1. Horodatage de l'acceptation et de la version des CGV acceptées (B2B ou B2C).
2. Création de la commande, statut « en attente de paiement ».
3. La composition est projetée en **lignes de commande réelles**, une par produit
   avec son taux, plus les lignes contenant, emballage, personnalisation et port
   à 20 %.
4. Les prix sont **gelés** : ceux du devis, jamais recalculés depuis le catalogue.
5. Paiement de l'acompte via Stripe. **Le webhook fait foi**, pas le retour
   navigateur. Facture d'acompte émise.
6. La commande passe en `CONFIRMEE` et entre dans la liste de courses de la semaine.

### 7.3 Substitutions — à la préparation, pas à la composition

Le moteur compose sur des produits disponibles. La substitution intervient quand un
producteur est en rupture le jour de l'achat :

1. Vous marquez le produit indisponible sur l'écran de disponibilité.
2. Le système propose le substitut principal, puis celui de secours, en vérifiant
   que sa valeur est **égale ou supérieure** et que le régime (alcool, allergènes,
   bio) est identique.
3. La ligne de commande est remplacée, l'écart de valeur reste à votre charge.
4. Une entrée est écrite dans `substitution` — journal non modifiable.
5. Le client voit « produit équivalent de valeur égale ou supérieure » dans son
   espace et dans les emails.

**Sur la limite de la mention générique.** Trois contraintes se cumulent :
l'information du consommateur (en B2C, une clause de substitution n'est licite que
si elle est prévue au contrat, que le remplaçant est de qualité et de prix
équivalents ou supérieurs, et que le client en est informé) ; les **allergènes**,
le règlement INCO imposant que ces informations soient disponibles avant la
conclusion d'une vente à distance ; et le droit de rétractation sur ce qui n'en est
pas exclu.

Ce que je propose, et qui respecte votre intention commerciale : la mention
générique reste telle quelle **dans le configurateur et le PDF de devis**. La
composition réellement livrée est nommée **sur le bon de livraison, la facture, et
une page « composition de votre coffret »** accessible par lien ou QR code. Côté
B2B, une case « j'autorise les substitutions équivalentes », cochée par défaut et
décochable. *Point à confirmer par votre conseil juridique — et par vous : c'est la
question 4 du §11.*

### 7.4 Liste de courses hebdomadaire

Source : les commandes confirmées dont la livraison tombe dans la semaine visée.
Agrégation par fournisseur puis par produit, quantités arrondies au multiple de
commande, minimums et règles de panachage appliqués, écart (surplus) affiché.
Export CSV et PDF par fournisseur, envoi par email, déclenché par Vercel Cron.

**La liste est figée en base à la génération.** Un rapport recalculé à la volée
n'est pas auditable et ne permet pas de comparer ce qui a été commandé et ce qui a
été reçu.

---

## 8. Le back-office : le poste que le changement de pile a créé

WordPress fournissait une administration complète. Il faut désormais l'écrire.
C'est le principal surcoût de la décision, et le principal risque de dérive du
projet. La parade est de construire un back-office **volontairement pauvre** :

| Écran | v1 | Pourquoi |
|---|---|---|
| Tableau de bord | Oui | Devis du jour, alertes, taux d'acceptation. Exigé par le brief |
| Catalogue produits | Oui | Prix, photo, disponibilité, complétude. C'est votre outil de travail quotidien |
| Disponibilité hebdomadaire | Oui | Sans lui, le modèle sans stock ne tient pas |
| Devis et commandes | Oui | Consultation, changement d'état, relance |
| Liste de courses | Oui | Le vrai gain opérationnel du projet |
| Substitutions | Oui | Obligation d'audit |
| Gabarits d'univers | Oui | Vous devez pouvoir créer un univers sans développeur |
| Paramètres du moteur | Oui | Les 15 paramètres, modifiables sans déploiement |
| Clients | Lecture seule | La création se fait par le tunnel |
| Remboursements, avoirs | **Non** | Traités dans Stripe en v1, réintégrés en v2 |
| Codes promo | **Non** | Hors périmètre |
| Éditeur de contenu | **Non** | Les pages éditoriales sont du contenu versionné dans le dépôt en v1 |

---

## 9. Périmètre v1 proposé

Le §1.2 l'impose : sans WooCommerce, il faut resserrer pour livrer. Voici ce que je
propose de tenir dans la v1, et ce que j'écarte explicitement.

**Dans la v1**
Configurateur en 5 étapes · moteur et ses 3 à 5 propositions · personnalisation
(échanger, ajouter, retirer, message, ruban, carte) · devis PDF automatique avec
garde-fou de validation · acceptation en ligne · acompte Stripe · commande et
facture avec TVA par ligne · comptes B2C et comptes pros à valider · affichage HT
pour les pros, TTC pour les particuliers · paliers dégressifs B2B · back-office du
§8 · liste de courses · substitutions · pages légales et RGPD · pages éditoriales
et SEO de base.

**Écarté de la v1, explicitement**
Multi-destinataires *(décision actée, v2)* · codes promo · remboursements en
back-office *(via Stripe)* · catalogue public à la carte *(on vend des coffrets,
pas des produits à l'unité)* · click & collect · multilingue · livraison hors France
*(l'expédition d'alcool hors de France déclenche les obligations d'accises et le
régime EMCS)* · éditeur de contenu.

### Lotissement

| Lot | Contenu | Dépend de |
|---|---|---|
| **0. Données** | Prix de vente, contenants, photos, dimensions, catalogue de saison, arbitrage des 42 TVA « À CONFIRMER » | **Vous.** Chemin critique. Classeur de saisie fourni |
| 1. Socle | Projet Next.js, Supabase réactivé, schéma Drizzle, import du catalogue, authentification | Validation de ce document |
| 2. Moteur | Gabarits, algorithme, tests unitaires moteur + TVA | Lot 0 (prix), lot 1 |
| 3. Configurateur | Parcours en 5 étapes, propositions, personnalisation | Lot 2, photos |
| 4. Devis | PDF, emails, acceptation en ligne, garde-fous | Lot 3 |
| 5. Commande | Stripe, acompte, webhook, factures, TVA par ligne | Lot 4 |
| 6. Back-office | Tableau de bord, disponibilité, liste de courses, substitutions | Lot 5 |
| 7. Conformité et B2B | CGV, RGPD, comptes pros, HT/TTC, paliers, import des 3 000 contacts | Lot 5 |
| 8. Mise en ligne | Domaine, SPF/DKIM, sauvegardes, supervision, recette | Tous |
| 9. v2 | Multi-destinataires, remboursements, codes promo | Après mise en ligne |

---

## 10. Bibliothèques : retenues et écartées

### Retenues

| Bibliothèque | Rôle | Pourquoi celle-là |
|---|---|---|
| **Drizzle ORM** | Accès données | Léger en serverless, migrations SQL lisibles, typage complet |
| **Zod** | Validation | Toute entrée utilisateur et tout webhook validés par un schéma |
| **Stripe SDK** | Paiement | Officiel. Aucune donnée bancaire dans notre code |
| **Resend + React Email** | Emails | Gabarits en React, bonne délivrabilité, domaine à authentifier |
| **@react-pdf/renderer** | PDF | Fonctionne en serverless, contrairement à Puppeteer |
| **Tailwind + shadcn/ui** | Interface | Composants copiés dans le projet, pas une dépendance qui impose son style |
| **Vitest** | Tests | Rapide, le domaine se teste sans rien démarrer |
| **Playwright** | Tests E2E | Le parcours devis → acompte doit être testé de bout en bout |
| **date-fns** | Dates | Semaines ISO pour la disponibilité et la liste de courses |

### Écartées, et pourquoi

| Écarté | Raison |
|---|---|
| **Prisma** | Moteur de requêtes plus lourd, démarrages à froid plus longs en serverless, migrations moins lisibles |
| **Puppeteer / Playwright pour le PDF** | Trop lourd pour une fonction Vercel : dépassements de temps et de taille |
| **Medusa, Saleor, Vendure** | Ce sont des moteurs e-commerce classiques. Ils imposent un modèle produit/variante/panier dans lequel un coffret composé sous budget ne rentre pas mieux que dans WooCommerce, avec un écosystème bien plus pauvre. Si l'on reprend un moteur e-commerce, autant reprendre WooCommerce |
| **Shopify / headless commerce** | Modèle de prix figé, TVA par ligne sur bundle non modélisable, commissions |
| **Un CMS headless (Strapi, Sanity)** | Un système de plus à héberger et à sécuriser pour quelques pages éditoriales. En v1, le contenu est versionné dans le dépôt |
| **NextAuth/Auth.js** | Supabase Auth est déjà là et gère la réinitialisation de mot de passe, la vérification d'email et les rôles. Deux systèmes d'authentification ne se justifient pas |
| **Redux, Zustand et consorts** | L'état du configurateur tient dans l'URL et quelques Server Actions. Un store global créerait des bugs de désynchronisation entre l'affichage et le devis |
| **Un service de TVA type Avalara** | Surdimensionné pour de la TVA franco-française |
| **Vercel Postgres au lieu de Supabase** | Vous avez déjà un projet Supabase en Europe, avec l'authentification et le stockage inclus. Trois services en un |

---

## 11. Ce qu'il me faut pour écrire la première ligne de code

**Validation**

1. **Ce document.** Validez-le, ou dites-moi ce que vous voulez changer.
2. **Le périmètre v1 du §9** — en particulier ce que j'en ai retiré.

**Réponses bloquantes**

3. **Le budget saisi par le client, c'est quoi ?** HT ou TTC ? Contenant et
   emballage inclus ? Frais de port inclus ? Personnalisation incluse ?
4. **Substitutions :** d'accord pour générique au devis, nominatif sur le bon de
   livraison et la facture ?
5. **Marge plancher** par gamme : en dessous de quel taux le moteur doit-il refuser
   une composition, même si elle remplit parfaitement le budget ?
6. **Le contenant :** qui le fournit, à quel coût, quelle contenance ? C'est ce qui
   borne le nombre de produits par coffret.
7. **Alcool :** « sans alcool » exclut-il les 33 produits `INGREDIENT_ALCOOLISE` ?
   *Recommandation : oui par défaut.*
8. **Acompte :** quel pourcentage, quelle échéance pour le solde ?
9. **Paliers de remise B2B :** les seuils exacts.

**Accès techniques**

10. Réactivation du projet Supabase `ooogbitnoqvrtwrpisnn` (il est en pause).
11. Compte Stripe (mode test suffit pour démarrer).
12. Compte Resend et **le nom de domaine définitif** — l'adresse `.vercel.app` ne
    permet pas d'authentifier les emails, et les devis partiront en spam.
13. Les photos produits, ou l'accord pour démarrer sur des visuels génériques par
    catégorie.

**En parallèle, sans m'attendre**

14. Remplir `SAISIE_PRIX_DE_VENTE.xlsx`, en commençant par le catalogue de saison.
