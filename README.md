# Coffret Juliette

Site de composition de coffrets et paniers garnis, adossé à une base produits /
fournisseurs reconstituée à partir des documents commerciaux des producteurs.

## Structure

| Dossier | Contenu |
|---|---|
| `coffrets-noel/` | Application Next.js 14 (App Router) : catalogue, questionnaire, moteur de composition, propositions chiffrées, devis imprimable, back-office lecture |
| `data/base-produits-noel/` | Base produits / fournisseurs 2026 : livrable XLSX 24 onglets + tables CSV (`export/`), extractions brutes des documents sources (`raw/`), scripts d'extraction et de normalisation (`build/`) |
| `docs/` | Conception de la plateforme, schéma de base de données, piste d'architecture WordPress / WooCommerce |

## Démarrage

```bash
cd coffrets-noel
npm install
npm run catalogue   # régénère data/catalogue.json depuis ../data/base-produits-noel
npm run dev         # http://localhost:3100
```

## Déploiement

Sur Vercel, régler le **Root Directory sur `coffrets-noel`**. Le catalogue est un
JSON versionné : aucune base de données ni variable d'environnement requise.
Optionnel : `NEXT_PUBLIC_SITE_URL` pour le sitemap et les métadonnées Open Graph.

Détail du fonctionnement dans `coffrets-noel/README.md`, détail des tables et des
règles de reconstitution dans `data/base-produits-noel/README.md`.
