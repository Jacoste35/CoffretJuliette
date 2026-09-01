# Coffret Juliette

Base de données produits et fournisseurs pour la composition de coffrets et
paniers garnis.

## Contenu

- `data/base-produits-noel/` — base produits / fournisseurs 2026 reconstituée à
  partir des documents commerciaux (tarifs, catalogues, facture).
  - `export/` — livrable : `BASE_PRODUITS_FOURNISSEURS_2026.xlsx` (24 onglets)
    et les mêmes tables en CSV, prêtes pour un import en base de données.
  - `raw/` — extractions brutes des documents sources.
  - `build/` — scripts d'extraction et de normalisation, référentiels de règles.

Voir `data/base-produits-noel/README.md` pour le détail des tables, des règles
appliquées et des sources.
