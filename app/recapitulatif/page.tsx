import type { Metadata } from "next";
import Link from "next/link";
import { construireDevis, emballagePour, numeroDevis } from "@/lib/engine";
import {
  ecrireBesoin,
  ecrireRemplacements,
  lireBesoin,
  lireExtras,
  lireRemplacements,
  propositionChoisie,
} from "@/lib/selection";
import { euros, poids, pourcent } from "@/lib/format";
import { PREPARATION, REMISES_QUANTITE, STATUT_HYPOTHESE } from "@/lib/parametres";
import type { Gamme } from "@/lib/types";

export const metadata: Metadata = { title: "Récapitulatif" };

export default async function Recapitulatif(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const besoin = lireBesoin(searchParams);
  const gamme = ((searchParams.g as Gamme) ?? "SIGNATURE") as Gamme;
  const remplacements = lireRemplacements(searchParams);
  const extras = lireExtras(searchParams);
  const proposition = propositionChoisie(besoin, gamme, remplacements);
  const devis = construireDevis(besoin, proposition, extras, numeroDevis(besoin, gamme));
  const emballage = emballagePour(gamme, besoin.budget).parametre;

  const params = ecrireBesoin(besoin);
  params.set("g", gamme);
  const sw = ecrireRemplacements(remplacements);
  if (sw) params.set("sw", sw);
  if (extras.length) params.set("x", extras.map((e) => e.id).join(","));

  return (
    <div className="container max-w-4xl py-12">
      <Link href={`/coffret?${params.toString()}`} className="text-sm text-chocolat-light hover:text-bordeaux">
        ← Modifier mon coffret
      </Link>

      <h1 className="mt-4 text-3xl text-bordeaux">Récapitulatif</h1>
      <p className="mt-2 text-chocolat-light">
        Coffret {proposition.libelle} · {besoin.quantite} exemplaire
        {besoin.quantite > 1 && "s"}
      </p>

      <section className="carte mt-8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-creme-dark/50 text-left text-xs uppercase tracking-wider text-chocolat-light">
            <tr>
              <th className="p-4">Désignation</th>
              <th className="p-4 text-right">Qté</th>
              <th className="p-4 text-right">P.U. HT</th>
              <th className="p-4 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {devis.lignes.map((ligne, i) => (
              <tr key={`${ligne.libelle}-${i}`} className="border-t border-or/20 align-top">
                <td className="p-4">
                  <span className="font-medium text-chocolat">{ligne.libelle}</span>
                  <span className="mt-1 block text-xs text-chocolat-light">{ligne.detail}</span>
                </td>
                <td className="p-4 text-right">{ligne.quantite}</td>
                <td className="p-4 text-right">{euros(ligne.prixUnitaireHt)}</td>
                <td className="p-4 text-right font-medium">{euros(ligne.totalHt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="font-serif text-lg text-bordeaux">Détail du prix</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Ligne libelle="Produits et emballage" valeur={euros(devis.totalProduitsHt)} />
            {devis.totalExtrasHt > 0 && (
              <Ligne libelle="Ajouts" valeur={euros(devis.totalExtrasHt)} />
            )}
            {devis.totalRemise > 0 ? (
              <Ligne libelle="Remise quantité" valeur={`− ${euros(devis.totalRemise)}`} />
            ) : (
              <p className="pt-1 text-xs italic text-chocolat-light">
                Aucune remise quantitative appliquée : vos fournisseurs n&apos;en prévoient
                aucune dans les documents actuels.
              </p>
            )}
            <div className="border-t border-or/25 pt-2">
              <Ligne
                libelle="Total HT hors transport"
                valeur={euros(devis.totalHtHorsTransport)}
                fort
              />
            </div>
            <Ligne
              libelle={`Transport (${devis.nbColis} colis, ${poids(devis.poidsTotalKg * 1000)})`}
              valeur={euros(devis.transportHt)}
            />
            <Ligne libelle="Total HT" valeur={euros(devis.totalHt)} fort />
            <Ligne libelle="TVA" valeur={euros(devis.totalTva)} />
            <div className="border-t border-or/25 pt-2">
              <Ligne libelle="Total TTC" valeur={euros(devis.totalTtc)} fort />
            </div>
          </dl>
          <p className="mt-3 text-xs text-chocolat-light">
            Le transport est refacturé à son coût et n&apos;est pas une source de marge.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-bordeaux">Ce que contient le prix</h2>
          <ul className="mt-3 space-y-3 text-sm text-chocolat-light">
            <li>
              <strong className="text-chocolat">Emballage</strong> —{" "}
              {emballage.libelle} : {emballage.description}.
            </li>
            <li>
              <strong className="text-chocolat">Protection</strong> —{" "}
              {proposition.nbProduitsFragiles} produit
              {proposition.nbProduitsFragiles > 1 ? "s" : ""} en verre ou fragile
              {proposition.nbProduitsFragiles > 1 ? "s" : ""}, protégé
              {proposition.nbProduitsFragiles > 1 ? "s" : ""} individuellement.
            </li>
            <li>
              <strong className="text-chocolat">Préparation</strong> —{" "}
              {PREPARATION.minutesParGamme[gamme]} minutes par coffret.
            </li>
            <li>
              <strong className="text-chocolat">Provenance</strong> — chaque produit porte
              le nom de son producteur et de sa commune.
            </li>
          </ul>

          <div className="mt-5 rounded border border-or/40 bg-or/5 p-4 text-xs leading-relaxed text-chocolat-light">
            <p className="font-medium text-or-dark">{STATUT_HYPOTHESE}</p>
            <p className="mt-1">
              Les coûts d&apos;emballage, de préparation et de transport utilisés ici sont
              des hypothèses. Les prix des produits, eux, proviennent des tarifs réels de
              vos fournisseurs.
              {REMISES_QUANTITE.length === 0 &&
                " Aucune grille de remise par volume n'est encore renseignée."}
            </p>
          </div>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={`/devis?${params.toString()}`}
          className="rounded-full bg-bordeaux px-8 py-3 font-medium text-creme hover:bg-bordeaux-dark"
        >
          Obtenir mon devis
        </Link>
        <Link
          href={`/coffret?${params.toString()}`}
          className="rounded-full border border-bordeaux px-8 py-3 font-medium text-bordeaux hover:bg-bordeaux/5"
        >
          Modifier
        </Link>
      </div>

      <p className="mt-6 text-xs text-chocolat-light">
        Marge estimée sur cette commande : {euros(devis.margeTotaleEur)} (
        {pourcent(devis.tauxMargeGlobal)}) — information interne, non affichée au client
        en production.
      </p>
    </div>
  );
}

function Ligne({ libelle, valeur, fort }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={fort ? "font-medium text-chocolat" : "text-chocolat-light"}>{libelle}</dt>
      <dd className={fort ? "font-medium text-bordeaux" : "text-chocolat"}>{valeur}</dd>
    </div>
  );
}
