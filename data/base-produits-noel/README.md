# Base produits / fournisseurs — coffrets et paniers garnis

Reconstitution de la base produits et fournisseurs à partir des documents
commerciaux fournis, en remplacement du fichier Excel perdu.

**Livrable principal :** `export/BASE_PRODUITS_FOURNISSEURS_2026.xlsx` (24 onglets)
Les mêmes tables sont disponibles en CSV dans `export/` pour l'import en base de données.

---

## 1. Règles appliquées

Ces règles ont été suivies sans exception :

| Règle | Application |
|---|---|
| Ne rien inventer | Toute donnée absente des documents vaut `À CONFIRMER`. Aucune valeur n'a été estimée, arrondie ou complétée « au plus probable ». |
| Ne rien supprimer silencieusement | Les lignes non exploitables (commentaire de tarif) sont conservées avec le statut `LIGNE_INFORMATIVE_NON_PRODUIT`. |
| Signaler les conflits | Onglets `CONFLITS`, `DOUBLONS`, `ANOMALIES`. Aucune fusion automatique n'a été effectuée. |
| Conserver la source | Chaque ligne porte `source` + `ligne_source` (numéro de ligne Excel, page PDF, section du tarif). |
| Ne pas déduire l'origine du distributeur | Un produit n'est **jamais** déclaré normand parce qu'il est vendu par une entreprise normande. Voir §4. |
| Aucune règle de remise inventée | Seules 3 règles de remise et 2 avantages commerciaux existent dans les documents. Aucune grille 1-49 / 50-99 / 100-199 n'y figure. |

## 2. Contenu

| Table | Lignes | Contenu |
|---|---|---|
| `PRODUITS` | 703 | Fiche produit étendue (93 colonnes) : identification, origine, prix, conditionnement, logistique, personnalisation, commercial, stock, qualité des données |
| `FOURNISSEURS` | 32 | 4 canaux de commande + 28 producteurs référencés au tarif du distributeur |
| `TARIFS` | 702 | Un prix relevé par ligne, avec le libellé exact de la colonne du document |
| `REMISES` | 5 | 3 règles de remise + 2 avantages commerciaux documentés |
| `OPTIONS` | 36 | Produits utilisables en extra (coffrets, objets, cosmétique) |
| `COFFRETS` / `COFFRETS_LIGNES` | 13 / 10 | Coffrets fournisseurs documentés + 3 gabarits vides Essentiel / Signature / Prestige |
| `CONTROLE_DES_DONNEES` | 40 | Tous les indicateurs de complétude et de fiabilité |
| `REPARTITION_CATEGORIES` | 36 | Volumétrie par catégorie / sous-catégorie |
| `PRODUITS_SCORES` | 702 | Scores proposés (noblesse, valeur perçue, local, Noël, logistique) |
| `PRODUITS_OPPORTUNITES` | 828 | Tags d'opportunité calculés à partir de données documentées |
| `PRODUITS_ALTERNATIVES` | 3 020 | Substituts : même sous-catégorie, même régime alcool, écart de prix ≤ 40 % |
| `CONDITIONS_FOURNISSEURS` | 7 | Règles de panachage, d'expédition et de minimum relevées au tarif |
| `PERSONNALISATION` | 1 | Constat d'absence documenté |
| `DOUBLONS` / `CONFLITS` / `ANOMALIES` | 115 / 2 / 4 | Points à arbitrer |
| `EMBALLAGES`, `EMBALLAGES_FOURNISSEURS`, `EMBALLAGES_TYPES`, `PROTECTIONS`, `TARIFS_TRANSPORT` | vides | Structures à alimenter — aucun document fourni ne contient ces données |
| `PARAMETRES_MOTEUR` | 15 | Paramètres du moteur, tous modifiables sans toucher au code |
| `SOURCES` | 4 | Inventaire documentaire |

## 3. Documents sources

| Source | Document | Émetteur | Nature |
|---|---|---|---|
| SRC-01 | `Tarif_et_bon_de_commande_2026.xlsx`, onglet *TARIF NORMAND DIRECT 2026* | Normand Direct Terroir | Tarif professionnel + bon de commande (lignes 10 à 512) |
| SRC-02 | `Tarif_et_bon_de_commande_2026.xlsx`, onglet *CARAMELS ISIGNY 2026* | Caramels d'Isigny | Catalogue tarifé, réf. NC + EAN + colisage |
| SRC-03 | `billy.pdf` | SARL Domaine de Billy | CGV + tarif producteur « à partir de 2026 », 3 pages |
| SRC-04 | `FACT_2600000025_...pdf` | Domaine de Brucan | **Facture** du 12/08/2026 — pas un tarif |

Les coordonnées bancaires (IBAN / BIC) présentes dans deux documents ont été
**volontairement exclues** de la base.

## 4. Comment l'origine est établie

Trois niveaux de preuve, jamais mélangés :

1. **`ADRESSE_PRODUCTEUR_DANS_LE_DOCUMENT`** — le document *est* le tarif du producteur
   et donne son adresse (Domaine de Billy à Rots, 14 ; Domaine de Brucan à Digosville, 50).
   Le lieu exact de fabrication reste `À CONFIRMER` : seul le siège est connu.
2. **`APPELLATION_PROTEGEE_CITEE_DANS_LE_DOCUMENT`** — AOC Cidre du Cotentin,
   Calvados AOC, Pommeau de Normandie. **Conditionné à la sous-catégorie du produit** :
   « Moutarde Calvados » et « Terrine de lièvre au Calvados » citent le calvados comme
   ingrédient et ne sont donc **pas** classés normands.
3. **`APPELLATION_PORTANT_SUR_UN_INGREDIENT_SEULEMENT`** / **`INDICE_DANS_LE_NOM_DU_PRODUIT_SEULEMENT`** —
   « Beurre d'Isigny AOP », « Miel de Fleurs de Normandie » : indice commercial, pas une preuve.
   Classés `NORMANDIE_INDIQUEE_DANS_LE_NOM_A_VERIFIER`.

**68 produits normands confirmés** sur 702 — dont 41 dans le Calvados et 4 dans la Manche.
Les 634 autres ne sont pas « non normands » : leur origine n'est simplement **pas documentée**.
Le tarif Normand Direct ne donne que le nom du producteur, jamais son adresse : c'est
l'information n° 1 à demander.

## 5. Alcool

- `OUI` (139) — boisson alcoolisée.
- `NON` (530) — aucun indice d'alcool.
- `INGREDIENT_ALCOOLISE` (33) — l'alcool est cité comme ingrédient (terrine au calvados,
  confiture pomme au cidre, caramel calvados). **Ni l'un ni l'autre** : à arbitrer
  explicitement pour les coffrets « sans alcool ».

## 6. Régénérer la base

```bash
# 1. Extraction fidèle du classeur (si le fichier source est disponible)
python3 build/extract_xlsx.py /chemin/Tarif_et_bon_de_commande_2026.xlsx raw/

# 2. Normalisation + export CSV et Excel
python3 build/normalize.py
```

Dépendance : `openpyxl`. Les fichiers `raw/*.csv` sont des transcriptions fidèles des
documents : ils constituent la trace vérifiable et permettent de rejouer la construction
sans les documents d'origine.

Les règles de classification sont dans des fichiers éditables, pas dans le code :
`build/regles_classification.csv` (34 règles ordonnées, première règle qui matche) et
`build/defauts_par_source.csv` (replis documentés par onglet / producteur).

## 7. Ce qui manque pour aller plus loin

| Donnée manquante | Conséquence | Où la saisir |
|---|---|---|
| **Prix de vente** | Marge, taux de marge et score de marge non calculables | `PRODUITS.prix_vente_ht` |
| **Dimensions produits** | Choix automatique d'emballage et poids volumétrique impossibles | `PRODUITS.longueur_cm/largeur_cm/hauteur_cm` |
| **Tarifs emballages** (RETIF, RAJA…) | Coût de coffret incomplet | `EMBALLAGES` |
| **Tarifs transporteurs** | Coût d'expédition non calculable | `TARIFS_TRANSPORT` |
| **Coûts de préparation** | Coût de revient incomplet | `PARAMETRES_MOTEUR` |
| **Adresses des 28 producteurs** | 612 produits sans origine documentée | `FOURNISSEURS` |
| **Conditions de personnalisation** | Aucune personnalisation vendable aujourd'hui | `PERSONNALISATION` |
| **Minimums de commande globaux** | Seuls les multiples par produit sont connus | `FOURNISSEURS.minimum_commande` |
| **Canal de commande Caramels d'Isigny** | Direct ou via Normand Direct ? | `FOURNISSEURS` |
