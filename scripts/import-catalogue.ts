/**
 * Import du catalogue : data/base-produits-noel/export/*.csv → base.
 *
 * Trois principes repris de la base source, et non négociables :
 *
 *  1. Ne rien inventer. Une valeur « À CONFIRMER » reste vide en base, elle
 *     n'est jamais estimée ni arrondie au plus probable.
 *  2. Ne rien corriger en silence. Les anomalies sont signalées dans un
 *     rapport, jamais réparées d'office.
 *  3. Ne rien activer par défaut. Un produit dont les données sont
 *     incomplètes reste invisible pour le moteur, quel que soit son intérêt
 *     commercial.
 *
 * Utilisation :
 *   npm run import:catalogue -- --dry-run   analyse seule, sans base
 *   npm run import:catalogue                écrit en base
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { sql } from 'drizzle-orm';
import { db, fermerConnexion } from '../src/db/client';
import {
  parametreMoteur,
  producteur,
  produit,
  produitScore,
  produitSubstitut,
} from '../src/db/schema';

const RACINE = join(process.cwd(), 'data', 'base-produits-noel', 'export');
const SEC = process.argv.includes('--dry-run');

type Ligne = Record<string, string>;

function lire(fichier: string): Ligne[] {
  const chemin = join(RACINE, fichier);
  if (!existsSync(chemin)) {
    throw new Error(`Fichier source introuvable : ${chemin}`);
  }
  return parse(readFileSync(chemin), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
  }) as Ligne[];
}

const VIDES = new Set(['', 'À CONFIRMER', 'A CONFIRMER', 'À DÉFINIR', 'A DEFINIR', 'NC']);

/** Une valeur non documentée reste nulle. Elle n'est jamais devinée. */
function texte(v: string | undefined): string | null {
  const s = (v ?? '').trim();
  return VIDES.has(s) ? null : s;
}

function nombre(v: string | undefined): number | null {
  const s = texte(v)?.replace(',', '.');
  if (s === null || s === undefined) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function centimes(v: string | undefined): number | null {
  const n = nombre(v);
  return n === null ? null : Math.round(n * 100);
}

/** « 0.055 » → 550 points de base. */
function tauxBp(v: string | undefined): number | null {
  const n = nombre(v);
  return n === null ? null : Math.round(n * 10_000);
}

function entier(v: string | undefined): number | null {
  const n = nombre(v);
  return n === null ? null : Math.round(n);
}

function booleen(v: string | undefined): boolean {
  return (texte(v) ?? '').toUpperCase() === 'OUI';
}

const REGIME = {
  OUI: 'BOISSON_ALCOOLISEE',
  INGREDIENT_ALCOOLISE: 'INGREDIENT_ALCOOLISE',
  NON: 'SANS_ALCOOL',
} as const;

const PREUVE_ORIGINE = new Set([
  'ADRESSE_PRODUCTEUR_DANS_LE_DOCUMENT',
  'APPELLATION_PROTEGEE_CITEE_DANS_LE_DOCUMENT',
  'APPELLATION_PORTANT_SUR_UN_INGREDIENT_SEULEMENT',
  'INDICE_DANS_LE_NOM_DU_PRODUIT_SEULEMENT',
]);

const GAMMES = new Set(['ESSENTIEL', 'SIGNATURE', 'PREMIUM', 'PRESTIGE']);

/**
 * 0 à 100. En dessous du seuil, le produit est invisible pour le moteur :
 * une donnée douteuse ne doit jamais finir dans un devis contractuel.
 */
const CRITERES_COMPLETUDE = [
  { poids: 30, cle: 'prix de vente', ok: (p: ProduitImporte) => p.prixVenteHtCentimes !== null },
  { poids: 20, cle: 'taux de TVA', ok: (p: ProduitImporte) => p.tauxTvaBp !== null },
  { poids: 10, cle: "prix d'achat", ok: (p: ProduitImporte) => p.prixAchatHtCentimes !== null },
  { poids: 10, cle: 'poids', ok: (p: ProduitImporte) => p.poidsNetG !== null },
  { poids: 10, cle: 'photo', ok: (p: ProduitImporte) => p.urlPhoto !== null },
  { poids: 5, cle: 'dimensions', ok: (p: ProduitImporte) => p.longueurMm !== null },
  { poids: 5, cle: 'description', ok: (p: ProduitImporte) => p.description !== null },
  { poids: 5, cle: 'producteur', ok: (p: ProduitImporte) => p.producteurRef !== null },
  { poids: 5, cle: 'niveau de gamme', ok: (p: ProduitImporte) => p.niveauGamme !== null },
] as const;

interface ProduitImporte {
  reference: string;
  nom: string;
  categorie: string;
  description: string | null;
  producteurRef: string | null;
  regimeAlcool: (typeof REGIME)[keyof typeof REGIME];
  prixAchatHtCentimes: number | null;
  prixVenteHtCentimes: number | null;
  tauxTvaBp: number | null;
  poidsNetG: number | null;
  longueurMm: number | null;
  urlPhoto: string | null;
  niveauGamme: string | null;
  brut: Ligne;
}

interface Anomalie {
  reference: string;
  nom: string;
  gravite: 'BLOQUANTE' | 'A_ARBITRER';
  message: string;
}

function detecterAnomalies(p: ProduitImporte): Anomalie[] {
  const a: Anomalie[] = [];
  const push = (gravite: Anomalie['gravite'], message: string) =>
    a.push({ reference: p.reference, nom: p.nom, gravite, message });

  // Un produit alcoolisé rangé parmi les boissons sans alcool finirait dans
  // un coffret « Sans alcool ». C'est l'erreur la plus coûteuse du lot.
  if (p.categorie === 'BOISSON_SANS_ALCOOL' && p.regimeAlcool !== 'SANS_ALCOOL') {
    push(
      'BLOQUANTE',
      `catégorie BOISSON_SANS_ALCOOL alors que le régime est ${p.regimeAlcool} — risque de coffret « sans alcool » contenant de l'alcool`,
    );
  }
  if (p.regimeAlcool === 'BOISSON_ALCOOLISEE' && p.tauxTvaBp !== null && p.tauxTvaBp !== 2000) {
    push(
      'BLOQUANTE',
      `boisson alcoolisée au taux de ${(p.tauxTvaBp / 100).toFixed(1)} % au lieu de 20 %`,
    );
  }
  if (p.tauxTvaBp === null) {
    push('A_ARBITRER', 'taux de TVA non documenté : inutilisable dans un devis');
  }
  if (p.prixAchatHtCentimes === 0) {
    push('A_ARBITRER', "prix d'achat à 0,00 € : produit offert ou donnée manquante ?");
  }
  return a;
}

function mapper(l: Ligne): ProduitImporte {
  const alcoolBrut = (texte(l.alcool) ?? 'NON').toUpperCase();
  const longueurCm = nombre(l.longueur_cm);
  return {
    reference: (l.id_produit ?? '').trim(),
    nom: (texte(l.nom_produit) ?? texte(l.libelle_source) ?? 'Sans nom').trim(),
    categorie: (texte(l.categorie) ?? 'NON_CLASSE').trim(),
    description: texte(l.description),
    producteurRef: texte(l.id_fournisseur),
    regimeAlcool: REGIME[alcoolBrut as keyof typeof REGIME] ?? 'SANS_ALCOOL',
    prixAchatHtCentimes: centimes(l.prix_achat_ht),
    prixVenteHtCentimes: centimes(l.prix_vente_ht),
    tauxTvaBp: tauxBp(l.tva_taux),
    poidsNetG: entier(l.poids_net_g),
    longueurMm: longueurCm === null ? null : Math.round(longueurCm * 10),
    urlPhoto: texte(l.url_photo),
    niveauGamme: GAMMES.has(texte(l.niveau_gamme) ?? '') ? (texte(l.niveau_gamme) as string) : null,
    brut: l,
  };
}

function completude(p: ProduitImporte): { score: number; manquants: string[] } {
  let score = 0;
  const manquants: string[] = [];
  for (const c of CRITERES_COMPLETUDE) {
    if (c.ok(p)) score += c.poids;
    else manquants.push(c.cle);
  }
  return { score, manquants };
}

async function main() {
  console.log(`\nImport du catalogue${SEC ? ' — analyse seule, aucune écriture' : ''}\n`);

  const fournisseurs = lire('FOURNISSEURS.csv');
  const produits = lire('PRODUITS.csv').filter((l) => (l.statut_ligne ?? '').trim() === 'PRODUIT');
  const scores = lire('PRODUITS_SCORES.csv');
  const alternatives = lire('PRODUITS_ALTERNATIVES.csv');
  const parametres = lire('PARAMETRES_MOTEUR.csv');

  const mappes = produits.map(mapper);
  const anomalies = mappes.flatMap(detecterAnomalies);

  const SEUIL = 70;
  let actifs = 0;
  const detail = mappes.map((p) => {
    const { score, manquants } = completude(p);
    const bloquante = anomalies.some((a) => a.reference === p.reference && a.gravite === 'BLOQUANTE');
    const actif = score >= SEUIL && !bloquante;
    if (actif) actifs++;
    return { p, score, manquants, actif };
  });

  console.log(`  Fournisseurs           ${fournisseurs.length}`);
  console.log(`  Produits               ${produits.length}`);
  console.log(`  Scores                 ${scores.length}`);
  console.log(`  Alternatives           ${alternatives.length}`);
  console.log(`  Paramètres moteur      ${parametres.length}`);

  const moyenne = Math.round(detail.reduce((s, d) => s + d.score, 0) / (detail.length || 1));
  console.log(`\n  Complétude moyenne     ${moyenne} / 100`);
  console.log(`  Actifs pour le moteur  ${actifs} / ${produits.length}  (seuil ${SEUIL})`);

  const manquantsParCle = new Map<string, number>();
  for (const d of detail) {
    for (const m of d.manquants) manquantsParCle.set(m, (manquantsParCle.get(m) ?? 0) + 1);
  }
  console.log('\n  Ce qui manque, par donnée :');
  for (const [cle, n] of [...manquantsParCle].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${cle}`);
  }

  const bloquantes = anomalies.filter((a) => a.gravite === 'BLOQUANTE');
  const arbitrer = anomalies.filter((a) => a.gravite === 'A_ARBITRER');
  console.log(`\n  Anomalies bloquantes   ${bloquantes.length}`);
  for (const a of bloquantes) console.log(`    ${a.reference}  ${a.nom}\n       → ${a.message}`);
  console.log(`\n  À arbitrer             ${arbitrer.length}`);
  const parMessage = new Map<string, number>();
  for (const a of arbitrer) {
    const cle = a.message.split(' :')[0] ?? a.message;
    parMessage.set(cle, (parMessage.get(cle) ?? 0) + 1);
  }
  for (const [m, n] of parMessage) console.log(`    ${String(n).padStart(4)}  ${m}`);

  if (SEC) {
    console.log('\nAnalyse seule : rien n\'a été écrit. Retirez --dry-run pour importer.\n');
    return;
  }

  const base = db();
  console.log('\nÉcriture en base…');

  const refVersId = new Map<string, string>();
  for (const f of fournisseurs) {
    const reference = (f.id_fournisseur ?? '').trim();
    if (!reference) continue;
    const [row] = await base
      .insert(producteur)
      .values({
        reference,
        nom: (texte(f.nom) ?? reference).trim(),
        role: texte(f.role),
        canalDeCommande: texte(f.canal_de_commande),
        contactNom: texte(f.contact_nom),
        telephone: texte(f.telephone),
        email: texte(f.email),
        siteInternet: texte(f.site_internet),
        adresse: texte(f.adresse),
        codePostal: texte(f.code_postal),
        ville: texte(f.ville),
        departement: texte(f.departement),
        region: texte(f.region),
        conditionsPaiement: texte(f.conditions_paiement),
        conditionsPanachage: texte(f.conditions_relevees_dans_le_tarif),
        minimumCommande: texte(f.minimum_commande),
        delais: texte(f.delais),
      })
      .onConflictDoUpdate({
        target: producteur.reference,
        set: { nom: sql`excluded.nom`, modifieLe: sql`now()` },
      })
      .returning({ id: producteur.id, reference: producteur.reference });
    if (row) refVersId.set(row.reference, row.id);
  }
  console.log(`  producteurs            ${refVersId.size}`);

  const produitRefVersId = new Map<string, string>();
  for (const d of detail) {
    const { p } = d;
    const l = p.brut;
    const preuve = texte(l.niveau_preuve_origine) ?? '';
    const [row] = await base
      .insert(produit)
      .values({
        reference: p.reference,
        referenceFournisseur: texte(l.reference_fournisseur),
        nom: p.nom,
        description: p.description,
        categorie: p.categorie,
        sousCategorie: texte(l.sous_categorie),
        producteurId: p.producteurRef ? (refVersId.get(p.producteurRef) ?? null) : null,
        marque: texte(l.marque),
        originePays: texte(l.origine_pays),
        origineRegion: texte(l.origine_region),
        origineDepartement: texte(l.origine_departement),
        appellation: texte(l.appellation),
        niveauPreuveOrigine: PREUVE_ORIGINE.has(preuve)
          ? (preuve as 'ADRESSE_PRODUCTEUR_DANS_LE_DOCUMENT')
          : 'NON_DOCUMENTEE',
        normandieConfirmee: (texte(l.caractere_local) ?? '') === 'NORMANDIE_CONFIRMEE',
        regimeAlcool: p.regimeAlcool,
        degreAlcool: texte(l.degre_alcool),
        typeAlcool: texte(l.type_alcool),
        prixAchatHtCentimes: p.prixAchatHtCentimes,
        prixVenteHtCentimes: p.prixVenteHtCentimes,
        tauxTvaBp: p.tauxTvaBp,
        poidsNetG: p.poidsNetG,
        poidsBrutG: entier(l.poids_brut_g),
        longueurMm: p.longueurMm,
        temperature: 'AMBIANT',
        fragile: booleen(l.fragile),
        contientVerre: booleen(l.contient_verre),
        conditionnement: texte(l.conditionnement),
        multipleCommande: entier(l.multiple_commande_valeur),
        minimumCommande: entier(l.minimum_commande),
        niveauGamme: p.niveauGamme as 'ESSENTIEL' | null,
        urlPhoto: p.urlPhoto,
        scoreCompletude: d.score,
        champsAConfirmer: d.manquants.length ? d.manquants.join(', ') : null,
        anomalie:
          anomalies
            .filter((a) => a.reference === p.reference)
            .map((a) => a.message)
            .join(' | ') || null,
        actif: d.actif,
        source: texte(l.source),
        ligneSource: texte(l.ligne_source),
      })
      .onConflictDoUpdate({
        target: produit.reference,
        set: {
          nom: sql`excluded.nom`,
          prixAchatHtCentimes: sql`excluded.prix_achat_ht_centimes`,
          tauxTvaBp: sql`excluded.taux_tva_bp`,
          scoreCompletude: sql`excluded.score_completude`,
          champsAConfirmer: sql`excluded.champs_a_confirmer`,
          anomalie: sql`excluded.anomalie`,
          actif: sql`excluded.actif`,
          modifieLe: sql`now()`,
        },
      })
      .returning({ id: produit.id, reference: produit.reference });
    if (row) produitRefVersId.set(row.reference, row.id);
  }
  console.log(`  produits               ${produitRefVersId.size}`);

  let nbScores = 0;
  for (const s of scores) {
    const id = produitRefVersId.get((s.id_produit ?? '').trim());
    if (!id) continue;
    await base
      .insert(produitScore)
      .values({
        produitId: id,
        noblesse: entier(s.score_noblesse),
        valeurPercue: entier(s.score_valeur_percue),
        local: entier(s.score_local),
        noel: entier(s.score_noel),
        logistique: entier(s.score_logistique),
      })
      .onConflictDoUpdate({
        target: produitScore.produitId,
        set: { noblesse: sql`excluded.noblesse`, modifieLe: sql`now()` },
      });
    nbScores++;
  }
  console.log(`  scores                 ${nbScores}`);

  // Deux substituts par produit : le principal, puis celui de secours.
  // Les alternatives sont déjà triées par proximité dans le fichier source.
  const parProduit = new Map<string, Ligne[]>();
  for (const a of alternatives) {
    const ref = (a.id_produit ?? '').trim();
    const liste = parProduit.get(ref);
    if (liste) liste.push(a);
    else parProduit.set(ref, [a]);
  }
  let nbSubstituts = 0;
  for (const [ref, liste] of parProduit) {
    const produitId = produitRefVersId.get(ref);
    if (!produitId) continue;
    const retenus = liste
      .slice()
      .sort((x, y) => Math.abs(nombre(x.ecart_prix_pct) ?? 999) - Math.abs(nombre(y.ecart_prix_pct) ?? 999))
      .slice(0, 2);
    for (const [i, alt] of retenus.entries()) {
      const substitutId = produitRefVersId.get((alt.id_alternative ?? '').trim());
      if (!substitutId || substitutId === produitId) continue;
      await base
        .insert(produitSubstitut)
        .values({
          produitId,
          substitutId,
          rang: i + 1,
          ecartPrixPct: entier(alt.ecart_prix_pct),
          critere: texte(alt.critere_de_rapprochement),
        })
        .onConflictDoUpdate({
          target: [produitSubstitut.produitId, produitSubstitut.rang],
          set: { substitutId: sql`excluded.substitut_id`, modifieLe: sql`now()` },
        });
      nbSubstituts++;
    }
  }
  console.log(`  substituts             ${nbSubstituts}`);

  for (const p of parametres) {
    const cle = (p.parametre ?? '').trim();
    if (!cle) continue;
    await base
      .insert(parametreMoteur)
      .values({
        cle,
        valeur: texte(p.valeur),
        unite: texte(p.unite),
        description: texte(p.description),
      })
      .onConflictDoUpdate({
        target: parametreMoteur.cle,
        set: { description: sql`excluded.description`, modifieLe: sql`now()` },
      });
  }
  await base
    .insert(parametreMoteur)
    .values({
      cle: 'SEUIL_COMPLETUDE',
      valeur: String(SEUIL),
      unite: '/ 100',
      description: 'En dessous, un produit est invisible pour le moteur de composition',
    })
    .onConflictDoNothing();
  console.log(`  paramètres             ${parametres.length + 1}`);

  await fermerConnexion();
  console.log('\nImport terminé.\n');
}

main().catch(async (e) => {
  console.error('\nÉchec de l\'import :', e instanceof Error ? e.message : e);
  await fermerConnexion().catch(() => {});
  process.exit(1);
});
