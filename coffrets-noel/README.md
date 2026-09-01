# Site coffrets & paniers garnis — V1

Application Next.js autonome (indépendante de l'app Apothéo à la racine du dépôt).
Elle consomme la base produits reconstituée dans `../data/base-produits-noel/`.

```bash
npm install
npm run catalogue   # régénère data/catalogue.json depuis la base
npm run dev         # http://localhost:3100
```

## Ce qui fonctionne

| Parcours | État |
|---|---|
| Accueil particulier / entreprise | ✅ |
| Catalogue : 629 produits, recherche, 5 filtres, tri, pagination | ✅ |
| Fiche produit avec traçabilité et données structurées | ✅ |
| Questionnaire (4 questions particulier, + identité entreprise) | ✅ |
| Moteur de composition, 3 propositions chiffrées | ✅ |
| Substitution d'un produit par une alternative réelle | ✅ |
| Ajout d'extras | ✅ |
| Récapitulatif avec décomposition complète du prix | ✅ |
| Devis numéroté, imprimable / PDF navigateur | ✅ |
| Page producteurs (traçabilité) | ✅ |
| Back-office lecture : marges, opportunités, paramètres | ✅ |
| SEO : metadata, Open Graph, robots, sitemap | ✅ |
| Responsive mobile / tablette / desktop | ✅ |

**Non développé en V1** (nécessite des comptes prestataires et une base de données) :
acceptation en ligne du devis, signature électronique, paiement Stripe, numéro de
commande, emails transactionnels, suivi de colis, espace client, édition en back-office.
Le schéma correspondant est dans `../docs/SCHEMA-BASE-DE-DONNEES-COFFRETS.md`.

## Déploiement Vercel

Le dépôt contient deux applications : l'app Apothéo à la racine et ce site dans
`coffrets-noel/`. Sur Vercel, **le Root Directory doit être réglé sur `coffrets-noel`**,
sinon c'est la mauvaise application qui sera construite.

En ligne de commande :

```bash
cd coffrets-noel
npx vercel login          # ou export VERCEL_TOKEN=...
npx vercel --prod
```

Depuis l'interface Vercel : *Add New Project* → importer `Jacoste35/PoolSante` →
**Root Directory : `coffrets-noel`** → Framework *Next.js* (détecté) → *Deploy*.
Aucune variable d'environnement n'est requise. Optionnel : `NEXT_PUBLIC_SITE_URL`
avec l'URL finale, pour que le sitemap et les métadonnées Open Graph pointent
vers le bon domaine.

Le catalogue est un fichier JSON versionné : aucune base de données, aucun secret,
rien à provisionner. 643 pages sont pré-rendues à la construction, dont les 629
fiches produits.

## État sans base de données

La V1 ne stocke rien. **L'intégralité de la sélection est encodée dans l'URL** : le
besoin, la gamme choisie, les remplacements et les extras. Un devis est donc un lien
partageable et rejouable à l'identique, et le moteur reste purement déterministe —
mêmes paramètres, même résultat. Le passage en base ne changera pas le moteur, il
remplacera seulement la source du catalogue et ajoutera la persistance.

## Le moteur (`lib/engine.ts`)

Module isolé, sans accès HTTP : entrée = besoin + catalogue + paramètres, sortie = trois
propositions chiffrées. Hiérarchie de décision, dans l'ordre : besoin client, budget,
cohérence, qualité perçue, niveau de gamme, disponibilité, logistique, **marge en
dernier** — elle départage deux produits également pertinents, jamais l'inverse.

Étapes :
1. **Filtrage** — régime alcool (« sans alcool » exclut aussi les produits dont
   l'alcool n'est qu'un ingrédient), catégories non vendables au détail.
2. **Emballage** — le plus adapté au budget, plafonné à 22 % du prix du coffret : un
   coffret à 30 € ne part pas dans une boîte prestige à 16 €.
3. **Remplissage** — la pièce maîtresse d'abord (elle structure le coffret et consomme
   la plus grosse part), puis les autres familles. Chaque emplacement est plafonné pour
   ne pas manger la part des suivants ; si un emplacement reste vide, la composition est
   rejouée avec un plafond plus strict.
4. **Ajustement au budget** — montée en gamme produit par produit, dans la même
   sous-catégorie, sans jamais dépasser l'enveloppe.
5. **Différenciation** — un produit déjà retenu dans une gamme est pénalisé dans les
   suivantes, pour que les trois offres se distinguent réellement.

Contraintes de cohérence : une seule sous-catégorie par coffret, producteurs variés.

Résultats mesurés sur le catalogue réel : à partir de 35 € HT de budget, les trois
gammes sont complètes ; Signature tombe à moins d'1 € du budget annoncé ; taux de marge
produit de 43 % à 51 %. En dessous de 35 €, le moteur compose ce qu'il peut et **affiche
le budget à partir duquel il pourrait ajouter un produit** plutôt que de livrer un
coffret creux.

## Origine des chiffres

| Donnée | Source | Fiabilité |
|---|---|---|
| Prix d'achat, TVA, producteurs, origines | Documents fournisseurs 2026 | Réelle |
| **Prix de vente** | Coefficients de marché, `../data/base-produits-noel/build/coefficients_prix.csv` | **Proposition à valider** |
| Coût et prix d'emballage | `lib/parametres.ts` | **Hypothèse de travail** |
| Coût de préparation | `lib/parametres.ts` | **Hypothèse de travail** |
| Grille de transport | `lib/parametres.ts` | **Hypothèse de travail** |
| Remises quantitatives | `REMISES_QUANTITE`, volontairement vide | Aucune dans les documents |

Ces natures sont affichées au client dans le récapitulatif et dans le devis : rien
n'est présenté comme un tarif ferme alors que c'en est une hypothèse.

## Identité visuelle

Palette bordeaux profond / crème / vert sapin / or vieilli / brun chocolat, interprétée
d'après la description écrite. **L'image de référence annoncée n'a pas été fournie** :
la direction artistique est à ajuster une fois reçue. Le nom « Comptoir des Chatonniers » est
un intitulé provisoire.
