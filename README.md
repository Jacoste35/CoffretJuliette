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
| Site v1 (parcours complet, moteur, devis) | **fonctionnel** — issu du prototype, porté sur Next 16 |
| Lot 1 — socle (schéma, import, authentification) | **posé** |
| Lot 0 — données (validation des prix, photos, contenants) | **côté client** |

Le parcours complet fonctionne : questionnaire → trois propositions → échange
de produits → récapitulatif → devis imprimable. Le moteur ne propose **jamais**
un coffret au-dessus du budget annoncé.

Les 701 prix de vente sont des **propositions par coefficients, à valider** :
le classeur `data/base-produits-noel/saisie/SAISIE_PRIX_DE_VENTE.xlsx` les
prérenseigne avec un statut PROPOSÉ / VALIDÉ / À REVOIR. Tant qu'ils ne sont
pas validés, le site l'affiche : les montants ne constituent pas une offre.

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
app/            routes Next.js : accueil, questionnaire, propositions,
                coffret, récapitulatif, devis, catalogue, producteurs, admin
src/lib/        moteur v1 (issu du prototype), catalogue JSON, env
src/domain/     logique métier pure (TVA en centimes) — cible du moteur v2
src/db/         schéma Drizzle (24 tables), migrations, client
src/auth/       Supabase Auth, côté serveur et navigateur
src/data/       catalogue.json généré par scripts/build-catalogue.py
scripts/        import du catalogue en base, génération du catalogue JSON
tests/unit/     calcul de TVA et centimes
data/           base produits / fournisseurs 2026 (source de vérité)
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
