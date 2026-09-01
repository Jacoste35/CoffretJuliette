# Comptoir des Chatonniers

Coffrets cadeaux gourmands composés à partir de producteurs normands et
français. Le client saisit un budget et un nombre de coffrets ; le site
propose plusieurs compositions qui utilisent ce budget au plus près sans
jamais le dépasser.

Deux marchés : entreprises (cadeaux clients, CSE, séminaires, fin d'année) et
particuliers. Approvisionnement hebdomadaire chez les producteurs, sans stock
permanent.

## État du projet

| | |
|---|---|
| Étape 1 — cadrage et architecture | **validé**, voir `docs/ARCHITECTURE.md` |
| Lot 1 — socle | **en cours** : squelette, schéma, import, authentification |
| Lot 2 — moteur de composition | à venir |
| Lot 0 — données (prix de vente, photos, contenants) | **bloquant, côté client** |

Le catalogue ne contient aujourd'hui **aucun prix de vente** : l'import le
signale et n'active aucun produit pour le moteur. C'est attendu, et c'est le
chemin critique du projet. Le classeur de saisie est dans
`data/base-produits-noel/saisie/SAISIE_PRIX_DE_VENTE.xlsx`.

## Pile technique

Next.js (App Router, TypeScript strict) déployé sur Vercel · PostgreSQL sur
Supabase, accédé par Drizzle · Supabase Auth · Stripe pour le paiement ·
Resend pour les emails · Vitest et Playwright pour les tests.

Le détail des choix, et ce qui a été écarté, est dans `docs/ARCHITECTURE.md`.

## Démarrer

```bash
npm install
cp .env.example .env.local     # puis renseigner les variables
npm run dev
```

Le site se construit et se déploie **sans aucune variable d'environnement** :
la page d'accueil est statique. `GET /api/sante` indique quels services sont
configurés, ce qui évite d'aller lire les variables dans l'interface de Vercel.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm test` | Tests unitaires du domaine (sans base ni réseau) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Génère une migration SQL depuis le schéma Drizzle |
| `npm run db:migrate` | Applique les migrations |
| `npm run import:catalogue -- --dry-run` | Analyse le catalogue **sans écrire** |
| `npm run import:catalogue` | Importe le catalogue en base |

## Organisation

```
app/            routes Next.js (site, configurateur, compte, admin, api)
src/domain/     logique métier pure — aucune dépendance, 100 % testable
src/db/         schéma Drizzle, migrations, client
src/auth/       Supabase Auth, côté serveur et navigateur
src/lib/        validation d'environnement, utilitaires
scripts/        import du catalogue
tests/unit/     moteur de composition et calcul de TVA
data/           base produits / fournisseurs 2026 (source d'import)
docs/           cadrage et architecture
```

**La règle structurante :** `src/domain/` n'importe ni Next, ni Drizzle, ni
Supabase, ni Stripe. Que du TypeScript. C'est ce qui rend les tests unitaires
rapides et ce qui protège la logique métier du prochain changement de pile.

## Deux règles métier à ne pas perdre de vue

**La TVA est portée par produit, jamais déduite d'une catégorie.** En droit
français, la confiserie, le chocolat, les margarines et le caviar relèvent du
taux normal bien qu'ils soient alimentaires. Sur ce catalogue cela concerne
151 produits, dont les 143 confiseries qui forment la plus grosse catégorie.
Voir `src/domain/tarification/taux-tva.ts`.

**Un produit dont les données sont incertaines n'entre jamais dans un devis.**
L'import calcule un score de complétude et signale les anomalies plutôt que de
les corriger en silence — trois sont connues à ce jour, dont deux Calvados
classés parmi les boissons sans alcool.

## Données produits

`data/base-produits-noel/` contient la base reconstituée à partir des
documents commerciaux 2026 : 703 produits, 32 fournisseurs, 3 020 alternatives
qualifiées, avec la source de chaque ligne. Voir son propre README pour les
règles appliquées.
